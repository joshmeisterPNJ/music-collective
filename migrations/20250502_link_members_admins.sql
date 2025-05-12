-- Link each member to its admin account
ALTER TABLE members
  ADD COLUMN admin_id INT UNIQUE
  REFERENCES admins(id)
  ON DELETE SET NULL;
