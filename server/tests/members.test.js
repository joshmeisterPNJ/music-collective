// server/tests/members.test.js
import request from 'supertest';
import app     from '../index.js';

describe('Members API smoke tests', () => {
  test('GET /api/public/members returns an array', async () => {
    const res = await request(app).get('/api/public/members').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/members without token → 401', async () => {
    await request(app).get('/api/members').expect(401);
  });
});
