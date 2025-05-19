// server/index.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import process from 'process';
import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';

// Determine which .env file to load
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const envFile    = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });

// Safety check: prevent wiping non-test DB when running tests
if (
  process.env.NODE_ENV === 'test' &&
  !/music_collective_test$/.test(process.env.DATABASE_URL)
) {
  console.error(
    `⛔️ Aborting tests: DATABASE_URL (${process.env.DATABASE_URL}) is not your test database.`
  );
  process.exit(1);
}

// Email transporter (nodemailer)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Uploads configuration ────────────────────────────────────
const { Pool } = pg;
const pool     = new Pool({ connectionString: process.env.DATABASE_URL });

const app = express();
app.use(cors());
app.use(express.json());

// ── File uploads via multer ─────────────────────────────────
const uploadDir = path.join(process.cwd(), 'uploads');
const upload    = multer({ dest: uploadDir });
app.use('/uploads', express.static(uploadDir));

// ── Auth middleware ─────────────────────────────────────────
function authenticateJWT(req, res, next) {
  const auth = req.headers.authorization?.split(' ');
  if (auth?.[0] !== 'Bearer' || !auth[1]) return res.sendStatus(401);
  try {
    req.user = jwt.verify(auth[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.sendStatus(403);
  }
}

async function permissionsForAdmin(adminId) {
  const result = await pool.query(
    `SELECT p.key
       FROM admin_permissions ap
       JOIN permissions p ON p.id = ap.permission_id
      WHERE ap.admin_id = $1`,
    [adminId]
  );
  return result.rows.map(r => r.key);
}

async function requirePermission(key, req, res, next) {
  if (req.user.role === 'superadmin') return next();

  const perm = await pool.query(
    'SELECT id FROM permissions WHERE key = $1',
    [key]
  );
  if (!perm.rows.length) return res.sendStatus(500);

  const has = await pool.query(
    'SELECT 1 FROM admin_permissions WHERE admin_id=$1 AND permission_id=$2',
    [req.user.id, perm.rows[0].id]
  );
  if (has.rows.length) return next();
  res.sendStatus(403);
}

// ── AUTH ROUTES ─────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  const { username, password, role } = req.body;
  const rawJoin = req.body.join_date;
  const joinDate = rawJoin && rawJoin.trim() !== "" ? rawJoin : null;

  // ── 1. validate input ───────────────────────────────────────────────
  if (!username || !password || !role) {
    return res
      .status(400)
      .json({ error: "username, password and role are required." });
  }

  // ── 2. allow only super-admin to add new admins after the first one ──
  const { rows: countRows } = await pool.query("SELECT COUNT(*) FROM admins");
  const adminCount = Number(countRows[0].count);

  if (adminCount > 0) {
    const auth = req.headers.authorization?.split(" ");
    if (auth?.[0] !== "Bearer" || !auth[1]) return res.sendStatus(401);

    let payload;
    try {
      payload = jwt.verify(auth[1], process.env.JWT_SECRET);
    } catch {
      return res.sendStatus(403);
    }
    if (payload.role !== "superadmin") return res.sendStatus(403);
  } else {
    if (role !== "superadmin") {
      return res
        .status(400)
        .json({ error: "First admin must be superadmin." });
    }
  }

  // ── 3. hash password & insert into admins ───────────────────────────
  const password_hash = await bcrypt.hash(password, 10);
  let newAdmin;
  try {
    const insert = await pool.query(
      `INSERT INTO admins
         (username, password_hash, role, must_change_password)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, username, role;`,
      [username, password_hash, role]
    );
    newAdmin = insert.rows[0];
  } catch (err) {
    console.error("Error registering admin:", err.stack);
    return res.status(500).json({ error: "Internal server error" });
  }

  const newAdminId = newAdmin.id;

  // ── 4. automatically grant “members” permission to plain admins ──────
  if (role === "admin") {
    const perm = await pool.query(
      "SELECT id FROM permissions WHERE key = $1",
      ["members"]
    );
    if (perm.rows.length) {
      await pool.query(
        `INSERT INTO admin_permissions (admin_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING;`,
        [newAdminId, perm.rows[0].id]
      );
    }
  }

  // ── 5. create stub profile row linked to this admin ────────────────
  try {
    await pool.query(
      `INSERT INTO members
         (name, role, email, admin_id, join_date)
       VALUES ($1, 'Artist', $2, $3, COALESCE($4, CURRENT_DATE))
       ON CONFLICT (admin_id) DO NOTHING;`,
      [
        username,
        `${username}@placeholder.local`,
        newAdminId,
        joinDate
      ]
    );
  } catch (err) {
    console.error("Error creating stub member:", err.stack);
    // continue even if stub fails
  }

  // ── 6. done ─────────────────────────────────────────────────────────
  res.status(201).json(newAdmin);
});


app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username and password are required.' });

  const { rows } = await pool.query(
    `SELECT id, password_hash, role, must_change_password
       FROM admins
      WHERE username = $1`,
    [username]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

  const perms = await permissionsForAdmin(user.id);
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      must_change_password: user.must_change_password,
      permissions: perms
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username,
      role: user.role,
      must_change_password: user.must_change_password,
      permissions: perms
    }
  });
});

app.get('/api/auth/me', authenticateJWT, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, username, role, must_change_password
       FROM admins
      WHERE id = $1`,
    [req.user.id]
  );
  if (!rows.length) return res.sendStatus(404);
  const perms = await permissionsForAdmin(req.user.id);
  res.json({ ...rows[0], permissions: perms });
});

// server/index.js (inside your existing file)
// ── Update Password Change Route to return a new JWT
app.post(
  '/api/auth/change-password',
  authenticateJWT,
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400)
        .json({ error: 'Current and new passwords are required.' });
    }

    // fetch existing hash
    const { rows } = await pool.query(
      'SELECT password_hash, role FROM admins WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.sendStatus(404);

    // verify current
    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

    // hash new & update password_hash + clear must_change_password
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE admins
          SET password_hash = $1,
              must_change_password = FALSE
        WHERE id = $2`,
      [newHash, req.user.id]
    );

    // fetch updated permissions
    const perms = await permissionsForAdmin(req.user.id);

    // issue a fresh token with must_change_password = false
    const token = jwt.sign(
      {
        id: req.user.id,
        role: rows[0].role,
        must_change_password: false,
        permissions: perms
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ message: 'Password updated successfully.', token });
  }
);

// ── EVENT CRUD (protected by auth + permission) ─────────────

app.get('/api/events', async (req, res) => {
  const { type } = req.query;
  const Q = {
    upcoming: 'SELECT * FROM events WHERE date >= CURRENT_DATE ORDER BY date ASC',
    past: 'SELECT * FROM events WHERE date <  CURRENT_DATE ORDER BY date DESC',
    default: 'SELECT * FROM events ORDER BY date ASC'
  };
  try {
    const { rows } = await pool.query(Q[type] || Q.default);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching events:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post(
  '/api/events',
  authenticateJWT,
  (req, res, next) => requirePermission('events', req, res, next),
  upload.single('image'),
  async (req, res) => {
    const { title, date, description } = req.body;
    if (!title || !date || !description) {
      return res.status(400).json({ error: 'title, date and description are required.' });
    }
    let imgUrl = '/assets/images/placeholder.JPG';
    if (req.file) {
      imgUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO events (title, date, description, image)
           VALUES ($1,$2,$3,$4)
         RETURNING *;`,
        [title, date, description, imgUrl]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Error creating event:', err.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.put(
  '/api/events/:id',
  authenticateJWT,
  (req, res, next) => requirePermission('events', req, res, next),
  upload.single('image'),
  async (req, res) => {
    const { id } = req.params;
    const { title, date, description } = req.body;
    if (!title || !date || !description) {
      return res.status(400).json({ error: 'title, date and description are required.' });
    }
    let imgUrl;
    if (req.file) {
      imgUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    } else {
      const ex = await pool.query('SELECT image FROM events WHERE id=$1', [id]);
      imgUrl = ex.rows[0]?.image || '/assets/images/placeholder.JPG';
    }
    try {
      const { rows } = await pool.query(
        `UPDATE events
            SET title=$1, date=$2, description=$3, image=$4
          WHERE id=$5
        RETURNING *;`,
        [title, date, description, imgUrl, id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found.' });
      res.json(rows[0]);
    } catch (err) {
      console.error('Error updating event:', err.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.delete(
  '/api/events/:id',
  authenticateJWT,
  (req, res, next) => requirePermission('events', req, res, next),
  async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query(
        'DELETE FROM events WHERE id=$1 RETURNING *;',
        [id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found.' });
      res.json({ message: 'Deleted', event: rows[0] });
    } catch (err) {
      console.error('Error deleting event:', err.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/admins  – superadmin only
app.get(
  '/api/admins',
  authenticateJWT,
  async (req, res) => {
    if (req.user.role !== 'superadmin') return res.sendStatus(403);
    const admins = await pool.query(
      `SELECT id, username, role
         FROM admins
        ORDER BY id`
    );
    const rows = await Promise.all(
      admins.rows.map(async a => ({
        ...a,
        permissions: await permissionsForAdmin(a.id)
      }))
    );
    res.json(rows);
  }
);

// PATCH /api/admins/:id/permissions
app.patch(
  '/api/admins/:id/permissions',
  authenticateJWT,
  async (req, res) => {
    if (req.user.role !== 'superadmin') return res.sendStatus(403);
    const adminId = req.params.id;
    const { permissionKeys } = req.body;
    await pool.query('DELETE FROM admin_permissions WHERE admin_id=$1', [adminId]);
    for (const key of permissionKeys) {
      const perm = await pool.query('SELECT id FROM permissions WHERE key=$1', [key]);
      if (perm.rows.length) {
        await pool.query(
          'INSERT INTO admin_permissions (admin_id, permission_id) VALUES ($1,$2)',
          [adminId, perm.rows[0].id]
        );
      }
    }
    res.json({ message: 'Permissions updated.' });
  }
);

// Public: contact a member via form
app.post('/api/members/:id/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required.' });
  }
  const { rows } = await pool.query(
    'SELECT email FROM members WHERE id = $1',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Member not found.' });

  try {
    await transporter.sendMail({
      from: 'no-reply@musiccollective.com',
      to: rows[0].email,
      replyTo: email,
      subject: `Contact from ${name} via Music Collective`,
      text: message,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Contact email failed:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// ── Public members endpoints ────────────────────────────────

// Public members list with photos
app.get('/api/public/members', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        name,
        city,
        country,
        photo        -- include the profile-photo URL
      FROM members
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching public members:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/public/members/:id', async (req, res) => {
  try {
    console.log(`→ GET /api/public/members/${req.params.id}`);
    const { rows } = await pool.query(
      `SELECT id, name, city, country, photo,
              genres, bio, instagram, soundcloud, spotify, bandcamp,
              portfolio_link, portfolio_description, portfolio_images,
              soundcloud_embeds, spotify_embeds,
              admin_id
         FROM members
        WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Member not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching public member detail:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ── MEMBERS CRUD (protected by auth + permission) ───────────

app.get(
  '/api/members',
  authenticateJWT,
  (req, res, next) => requirePermission('members', req, res, next),
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT *
           FROM members
          ORDER BY name ASC`
      );
      res.json(rows);
    } catch (err) {
      console.error('Error fetching members:', err.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.get(
  '/api/members/:id',
  authenticateJWT,
  (req, res, next) => requirePermission('members', req, res, next),
  async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query(
        'SELECT * FROM members WHERE id = $1',
        [id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found.' });
      res.json(rows[0]);
    } catch (err) {
      console.error('Error fetching member:', err.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ── Create member ───────────────────────────────────────────
app.post(
  '/api/members',
  authenticateJWT,
  (req, res, next) => requirePermission('members', req, res, next),
  upload.fields([
    { name: 'photo',            maxCount: 1 },
    { name: 'portfolio_images', maxCount: 10 }
  ]),
  async (req, res) => {
    const {
      name, role, genres, bio,
      join_date, email, city, country,
      instagram, soundcloud, spotify, bandcamp,
      portfolio_link, portfolio_description,
      soundcloud_embeds: scRaw,
      spotify_embeds:    spRaw
    } = req.body;

    if (!name || !role || !email) {
      return res.status(400)
        .json({ error: 'name, role, and email are required.' });
    }

    // build file URLs (unchanged)
    let photoUrl = null;
    if (req.files?.photo?.[0]) {
      photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.files.photo[0].filename}`;
    }
    let portfolioImgs = null;
    if (req.files?.portfolio_images?.length) {
      portfolioImgs = req.files.portfolio_images.map(
        f => `${req.protocol}://${req.get('host')}/uploads/${f.filename}`
      );
    }

    // parse embed arrays (strings → JSON) and cap at 3
    let soundcloudEmbeds = [];
    try {
      soundcloudEmbeds = JSON.parse(scRaw);
    } catch {}
    if (!Array.isArray(soundcloudEmbeds)) soundcloudEmbeds = [];
    soundcloudEmbeds = soundcloudEmbeds.slice(0,3);

    let spotifyEmbeds = [];
    try {
      spotifyEmbeds = JSON.parse(spRaw);
    } catch {}
    if (!Array.isArray(spotifyEmbeds)) spotifyEmbeds = [];
    spotifyEmbeds = spotifyEmbeds.slice(0,3);

    try {
      const { rows } = await pool.query(
        `INSERT INTO members
           ( name, role, genres, bio, join_date, email, city, country,
             instagram, soundcloud, spotify, bandcamp,
             photo, portfolio_link, portfolio_description, portfolio_images,
             soundcloud_embeds, spotify_embeds
           )
         VALUES
           ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
            $13,$14,$15,$16,$17,$18)
       RETURNING *;`,
        [
          name, role, genres, bio, join_date, email,
          city, country, instagram, soundcloud, spotify, bandcamp,
          photoUrl, portfolio_link, portfolio_description, portfolioImgs,
          soundcloudEmbeds, spotifyEmbeds
        ]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Error creating member:', err.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


function cleanEmbed(raw, provider) {
  // Pull out the src attr with a cheap regex
  const srcMatch = raw.match(/src\s*=\s*["']([^"']+)["']/i);
  if (!srcMatch) return null;
  const src = srcMatch[1];

  // Allow-list the host
  if (provider === 'soundcloud' &&
      !/^https:\/\/w\.soundcloud\.com\/player\//.test(src)) return null;

  if (provider === 'spotify' &&
      !/^https:\/\/open\.spotify\.com\/embed\//.test(src)) return null;

  // Minimal sandboxed iframe
  const safe = `<iframe src="${src}" width="100%" height="166" frameborder="0" allow="autoplay"></iframe>`;

  // Final pass through sanitize-html (drops any sneaky attrs)
  return sanitizeHtml(safe, {
    allowedTags:   ['iframe'],
    allowedAttributes: { iframe: ['src', 'width', 'height', 'frameborder', 'allow'] },
  });
}

// ── Update member ───────────────────────────────────────────
app.put(
  '/api/members/:id',
  authenticateJWT,
  (req, res, next) => requirePermission('members', req, res, next),
  upload.fields([
    { name: 'photo',            maxCount: 1 },
    { name: 'portfolio_images', maxCount: 10 },
  ]),
  async (req, res) => {
    const { id } = req.params;
    const {
      name, role, genres, bio,
      email, city, country,
      instagram, soundcloud, spotify, bandcamp,
      portfolio_link, portfolio_description,
      soundcloud_embeds: scRaw = '[]',
      spotify_embeds:    spRaw = '[]',
    } = req.body;

    if (!name || !role || !email)
      return res.status(400).json({ error: 'name, role, and email are required.' });

    // ── fetch current row so we keep existing photo / gallery
    const { rows: cur } = await pool.query(
      'SELECT photo, portfolio_images FROM members WHERE id = $1',
      [id]
    );
    if (!cur.length) return res.status(404).json({ error: 'Member not found.' });
    const existing = cur[0];

    // ── photo & gallery ───────────────────────────────────────────
    let photoUrl = existing.photo;
    if (req.files?.photo?.[0]) {
      photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.files.photo[0].filename}`;
    }

    let portfolioImgs = existing.portfolio_images || [];
    if (req.files?.portfolio_images?.length) {
      portfolioImgs = req.files.portfolio_images.map(
        f => `${req.protocol}://${req.get('host')}/uploads/${f.filename}`
      );
    }

    // ── sanitize embeds ──────────────────────────────────────────
    let scEmbeds;
    try { scEmbeds = JSON.parse(scRaw); } catch { scEmbeds = []; }
    if (!Array.isArray(scEmbeds)) scEmbeds = [];
    scEmbeds = scEmbeds
      .slice(0, 3)
      .map(e => cleanEmbed(e, 'soundcloud'))
      .filter(Boolean);

    let spEmbeds;
    try { spEmbeds = JSON.parse(spRaw); } catch { spEmbeds = []; }
    if (!Array.isArray(spEmbeds)) spEmbeds = [];
    spEmbeds = spEmbeds
      .slice(0, 3)
      .map(e => cleanEmbed(e, 'spotify'))
      .filter(Boolean);

    // ── update row ───────────────────────────────────────────────
    try {
      const { rows } = await pool.query(
        `UPDATE members
            SET name                  = $1,
                role                  = $2,
                genres                = $3,
                bio                   = $4,
                email                 = $5,
                city                  = $6,
                country               = $7,
                instagram             = $8,
                soundcloud            = $9,
                spotify               = $10,
                bandcamp              = $11,
                photo                 = $12,
                portfolio_link        = $13,
                portfolio_description = $14,
                portfolio_images      = $15::jsonb,
                soundcloud_embeds     = $16::jsonb,
                spotify_embeds        = $17::jsonb,
                updated_at            = now()
          WHERE id = $18
        RETURNING *;`,
        [
          name, role, genres, bio, email,
          city, country, instagram, soundcloud, spotify, bandcamp,
          photoUrl, portfolio_link, portfolio_description,
          JSON.stringify(portfolioImgs),
          JSON.stringify(scEmbeds),
          JSON.stringify(spEmbeds),
          id,
        ]
      );
      res.json(rows[0]);
    } catch (err) {
      console.error('Error updating member:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);



app.delete(
  '/api/members/:id',
  authenticateJWT,
  (req, res, next) => requirePermission('members', req, res, next),
  async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query(
        'DELETE FROM members WHERE id=$1 RETURNING *;',
        [id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found.' });
      res.json({ message: 'Deleted', member: rows[0] });
    } catch (err) {
      console.error('Error deleting member:', err.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/admins/:id  (superadmin only)
app.delete('/api/admins/:id',
  authenticateJWT,
  async (req, res) => {
    if (req.user.role !== 'superadmin') return res.sendStatus(403);
    const { id } = req.params;
    await pool.query('DELETE FROM admin_permissions WHERE admin_id=$1',[id]);
    await pool.query('DELETE FROM admins WHERE id=$1',[id]);
    res.json({ message:'Admin deleted' });
  });


  if (process.env.NODE_ENV !== 'test') {
    const port = process.env.PORT || 3001;
    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });
  }
  
  export default app;
  