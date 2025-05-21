import { Router } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'node:crypto';
import assert from 'node:assert';

const router = Router();

/* ── env & constants ─────────────────────────────────────────────── */
const {
  USE_LOCAL_UPLOADS = 'true',
  R2_ENDPOINT,
  R2_BUCKET,
  R2_KEY,
  R2_SECRET,
} = process.env;

const MAX_FILE_SIZE = 10 * 1024 * 1024;           // 10 MB
const ALLOWED_MIME  = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/* ── S3 client (Cloudflare R2) ────────────────────────────────────── */
let s3 = null;
if (USE_LOCAL_UPLOADS === 'false') {
  assert(
    R2_ENDPOINT && R2_BUCKET && R2_KEY && R2_SECRET,
    'R2 env vars must all be set when USE_LOCAL_UPLOADS=false'
  );
  s3 = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_KEY,
      secretAccessKey: R2_SECRET,
    },
  });
}

/**
 * GET /api/uploads/presign?filename=x&contentType=y&size=n
 * Returns { url, headers, publicUrl }  — or { url:null } when local uploads
 */
router.get('/presign', async (req, res, next) => {
  try {
    /* ── 1. validate query params ------------------------------------ */
    const {
      filename = '',
      contentType = '',
      size = 0,
    } = req.query;

    if (!filename || !contentType) {
      return res
        .status(400)
        .json({ error: 'filename and contentType required' });
    }
    if (!ALLOWED_MIME.has(contentType)) {
      return res.status(400).json({ error: 'Unsupported MIME type' });
    }
    const bytes = Number(size) || 0;
    if (bytes > MAX_FILE_SIZE) {
      return res.status(413).json({ error: 'File too large. Max 10 MB.' });
    }

    /* ── 2. dev / offline mode — no presign needed ------------------- */
    if (USE_LOCAL_UPLOADS === 'true') {
      return res.json({ url: null });
    }

    /* ── 3. generate Cloudflare R2 presigned URL --------------------- */
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const key = `${crypto.randomUUID()}/${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: 'public-read',
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });

    res.json({
      url,
      headers: { 'Content-Type': contentType },
      publicUrl: `${R2_ENDPOINT}/${R2_BUCKET}/${key}`,
    });
  } catch (err) {
    next(err);
  }
});


export default router;
