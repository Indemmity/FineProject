-- P0.3 - Application tracker persistence
-- Adds lifecycle timestamps so applications can be stored durably in Postgres.

ALTER TABLE IF EXISTS applications
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE IF EXISTS applications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
