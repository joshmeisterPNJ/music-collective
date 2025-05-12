ALTER TABLE members
  ADD COLUMN portfolio_link        TEXT,
  ADD COLUMN portfolio_description TEXT,
  ADD COLUMN portfolio_images      JSONB;
