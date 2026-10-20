-- Tenant Schema Migration: 030
-- Description: Add family_id, absolute_expires_at, used_at, replaced_by_token_id for refresh token family rotation, reuse detection, and absolute session lifetime

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS family_id UUID DEFAULT gen_random_uuid();
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS absolute_expires_at TIMESTAMP;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS used_at TIMESTAMP;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS replaced_by_token_id UUID;

UPDATE refresh_tokens SET family_id = id WHERE family_id IS NULL;
UPDATE refresh_tokens SET absolute_expires_at = expires_at WHERE absolute_expires_at IS NULL;

CREATE INDEX IF NOT EXISTS refresh_tokens_family_id_idx ON refresh_tokens (family_id);
