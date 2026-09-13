-- Tenant Schema User Permissions Migration
-- Version: 005
-- Description: Per-user permission overrides managed by salon admin

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  PRIMARY KEY (user_id, permission_id),
  CONSTRAINT user_permissions_user_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT user_permissions_permission_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_permissions_user_id_idx ON user_permissions(user_id);
