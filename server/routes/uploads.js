import { Router } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'node:crypto';
import assert from 'node:assert';

const router = Router();

// Load once at startup
const {
  USE_LOCAL_UPLOADS = 'true',
  R2_ENDPOINT,
  R2_BUCKET,
  R2_KEY,
  R2_SECRET,
} = process.env;

let s3 = null;
if (USE_LOCAL_UPLOADS === 'false') {
  assert(
    R2_ENDPOINT && R2_BUCKET && R2_KEY && R2_SECRET,
    'R2 env vars must all be set when USE_LOCAL_UPLOADS=false'
  );
  s3 = new S3Client({
    region: 'auto',             // Cloudflare ignores region
    endpoint: R2_ENDPOINT,      // e.g. https://1234abcd.r2.cloudflarestorage.com
    credentials: {
      accessKeyId: R2_KEY,
      secretAccessKey: R2_SECRET,
    },
  });
}

/**
 * GET /api/uploads/presign?filename=<name>&contentType=<mime>
 * Returns JSON:
 *   { url, headers, publicUrl }
 * - url: signed PUT URL, or null if USE_LOCAL_UPLOADS=true
 * - headers: headers to include on the PUT
 * - publicUrl: the readable URL after upload
 */
router.get('/presign', async (req, res, next) => {
  try {
    if (USE_LOCAL_UPLOADS === 'true') {
      return res.json({ url: null });
    }

    const { filename = 'file', contentType = 'application/octet-stream' } = req.query;
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
