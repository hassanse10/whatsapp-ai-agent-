-- Migration 004: Add per-user session tracking fields to user_agents
ALTER TABLE user_agents ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);
ALTER TABLE user_agents ADD COLUMN IF NOT EXISTS qr_code TEXT;

CREATE INDEX IF NOT EXISTS idx_user_agents_status ON user_agents(whatsapp_status);
