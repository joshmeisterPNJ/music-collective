-- migrations/20240501_create_initial_schema.sql
BEGIN;

-- 1. permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL    PRIMARY KEY,
  key         VARCHAR   UNIQUE NOT NULL,
  description TEXT
);

-- 2. admins table
CREATE TABLE IF NOT EXISTS admins (
  id                   SERIAL       PRIMARY KEY,
  username             VARCHAR      UNIQUE NOT NULL,
  password_hash        TEXT         NOT NULL,
  role                 VARCHAR      NOT NULL,
  must_change_password BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. join table for admin ↔ permission
CREATE TABLE IF NOT EXISTS admin_permissions (
  admin_id      INT REFERENCES admins(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (admin_id, permission_id)
);

-- 4. members table (needed for stub profiles)
CREATE TABLE IF NOT EXISTS members (
  id                     SERIAL       PRIMARY KEY,
  name                   VARCHAR      NOT NULL,
  role                   VARCHAR      NOT NULL,
  genres                 TEXT,
  bio                    TEXT,
  join_date              DATE,
  email                  VARCHAR      NOT NULL,
  city                   VARCHAR,
  country                VARCHAR,
  instagram              VARCHAR,
  soundcloud             VARCHAR,
  spotify                VARCHAR,
  bandcamp               VARCHAR,
  photo                  VARCHAR,   -- will be added later by your photo migration
  portfolio_link         TEXT,      -- added later
  portfolio_description  TEXT,      -- added later
  portfolio_images       JSONB,     -- added later
  soundcloud_embeds      JSONB,     -- added later
  spotify_embeds         JSONB,     -- added later
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. seed the "members" permission
INSERT INTO permissions(key, description)
VALUES (
  'members',
  'Grants access to the Members module'
)
ON CONFLICT (key) DO NOTHING;

COMMIT;
