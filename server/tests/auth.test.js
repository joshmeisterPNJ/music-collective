// server/tests/auth.test.js
import request from 'supertest';
import app     from '../index.js';     // index.js has `export default app`

import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query('TRUNCATE admins CASCADE');
await pool.end();


describe('Auth API smoke tests', () => {
  const admin = {
    username: 'ci_test_admin',
    password: 'TestPass123!',
    role:     'superadmin',
  };

  test('POST /api/auth/register bootstraps first super-admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(admin)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toMatchObject({ username: admin.username, role: 'superadmin' });
  });

  test('POST /api/auth/login returns token and user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: admin.username, password: admin.password })
      .expect(200);

    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ username: admin.username, role: 'superadmin' });
  });
}
);
