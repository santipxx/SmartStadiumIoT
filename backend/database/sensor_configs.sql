CREATE TABLE IF NOT EXISTS sensor_configs (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
  calibration_offsets JSONB NOT NULL DEFAULT '{}'::jsonb,
  parameter_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_notes TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
