CREATE TABLE IF NOT EXISTS delivery_men (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  phone        VARCHAR(50)  NOT NULL,
  vehicle_type VARCHAR(100),
  license_id   VARCHAR(100),
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_man_id UUID REFERENCES delivery_men(id) ON DELETE SET NULL;
