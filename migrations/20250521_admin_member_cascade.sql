BEGIN;
DELETE FROM members WHERE admin_id IS NOT NULL AND admin_id NOT IN (SELECT id FROM admins);
UPDATE members SET id = admin_id WHERE admin_id IS NOT NULL AND id <> admin_id AND NOT EXISTS (SELECT 1 FROM members x WHERE x.id = admin_id);
SELECT setval('members_id_seq', GREATEST((SELECT MAX(id) FROM members), 1));
ALTER TABLE members ADD CONSTRAINT members_admin_id_unique UNIQUE (admin_id);
ALTER TABLE members ADD CONSTRAINT members_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;
COMMIT;
