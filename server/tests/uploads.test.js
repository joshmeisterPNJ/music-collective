// server/tests/uploads.test.js
import request from 'supertest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import app from '../index.js';               // your Express instance

const api = request(app);

describe('R2 presign endpoint edge-cases', () => {
  const endpoint = '/api/uploads/presign';

  test('oversize image returns 413', async () => {
    // build a 11 MB dummy buffer
    const big = Buffer.alloc(11 * 1024 * 1024, 0);
    const res = await api
      .get(endpoint)
      .query({ filename: 'big.jpg', contentType: 'image/jpeg', size: big.length });

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/File too large/i);
  });

  test('wrong MIME returns 400', async () => {
    const res = await api
      .get(endpoint)
      .query({ filename: 'bad.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mime/i);
  });

  test('missing contentType returns 400', async () => {
    const res = await api
      .get(endpoint)
      .query({ filename: 'x.jpg' });          // omits contentType

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/contentType/i);
  });
});
