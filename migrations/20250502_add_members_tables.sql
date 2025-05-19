-- 20250502_add_members_tables.sql

-- 1) Seed the “members” permission (description now required)
INSERT INTO permissions(key, description)
VALUES ('members', 'Grants access to the Members module')
ON CONFLICT (key) DO NOTHING;

-- 2) Core members table
CREATE TABLE IF NOT EXISTS members (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR NOT NULL,
  role         VARCHAR NOT NULL,
  genres       TEXT,
  bio          TEXT,
  join_date    DATE,
  email        VARCHAR NOT NULL,
  city         VARCHAR,
  country      VARCHAR,
  instagram    VARCHAR,
  soundcloud   VARCHAR,
  spotify      VARCHAR,
  bandcamp     VARCHAR,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Profile images table
CREATE TABLE IF NOT EXISTS member_images (
  id         SERIAL PRIMARY KEY,
  member_id  INT REFERENCES members(id) ON DELETE CASCADE,
  url        VARCHAR NOT NULL,
  alt_text   VARCHAR,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Portfolio items table
CREATE TABLE IF NOT EXISTS member_portfolio (
  id          SERIAL PRIMARY KEY,
  member_id   INT REFERENCES members(id) ON DELETE CASCADE,
  title       VARCHAR NOT NULL,
  description TEXT,
  url         VARCHAR,
  image_url   VARCHAR,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
