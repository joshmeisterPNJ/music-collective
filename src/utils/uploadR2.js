// src/utils/uploadR2.js
import axios from 'axios';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Upload one File object to Cloudflare R2 and return the public URL.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function uploadToR2(file) {
  // client-side size guard
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Max ${MAX_FILE_SIZE / (1024 * 1024)} MB.`);
  }

  // 1️⃣ ask the server for a signed upload URL
  const { data: presign } = await axios.get('/api/uploads/presign', {
    params: { filename: file.name, contentType: file.type }
  });

  // 2️⃣ upload file directly to R2
  await axios.put(presign.url, file, { headers: presign.headers });

  // 3️⃣ return the public URL for storage in the DB
  return presign.publicUrl;
}
