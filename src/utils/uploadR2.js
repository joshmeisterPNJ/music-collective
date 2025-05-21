import axios from 'axios';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Upload one File object to Cloudflare R2 and return its public URL.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function uploadToR2(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Max 10 MB.');
  }

  const { data: presign } = await axios.get('/api/uploads/presign', {
    params: {
      filename: file.name,
      contentType: file.type,
      size: file.size,            // sent for server-side guard
    },
  });

  // local-uploads mode: skip PUT, return null so caller can handle
  if (!presign.url) return null;

  await axios.put(presign.url, file, { headers: presign.headers });
  return presign.publicUrl;
}
