CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  zone VARCHAR NOT NULL,
  device_type VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telemetry (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  temperature DECIMAL(5, 2) NULL,
  humidity DECIMAL(5, 2) NULL,
  noise DECIMAL(6, 2) NULL,
  occupancy DECIMAL(5, 2) NULL,
  co2 DECIMAL(8, 2) NULL,
  light_level DECIMAL(8, 2) NULL,
  people_flow INTEGER NULL,
  energy_consumption DECIMAL(8, 2) NULL,
  voltage DECIMAL(6, 2) NULL,
  door_status VARCHAR NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  alert_type VARCHAR NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NULL REFERENCES devices(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  metric VARCHAR NOT NULL,
  operator VARCHAR NOT NULL DEFAULT 'gt',
  threshold DECIMAL(10, 2) NOT NULL,
  severity VARCHAR NOT NULL DEFAULT 'medium',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_commands (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  command VARCHAR NOT NULL,
  value TEXT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensor_configs (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
  calibration_offsets JSONB NOT NULL DEFAULT '{}'::jsonb,
  parameter_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_notes TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS alert_rules_seed_name_idx
ON alert_rules (name)
WHERE device_id IS NULL;

INSERT INTO devices (id, device_code, name, zone, device_type, status)
VALUES
  (1, 'sensor-sur-alta', 'Sensor Sur Alta', 'Tribuna Sur Alta', 'Digital Twin', 'active'),
  (2, 'sensor-sur-baja', 'Sensor Sur Baja', 'Tribuna Sur Baja', 'Simulado', 'active'),
  (3, 'sensor-norte-alta', 'Sensor Norte Alta', 'Tribuna Norte Alta', 'Simulado', 'active'),
  (4, 'sensor-norte-baja', 'Sensor Norte Baja', 'Tribuna Norte Baja', 'API/DataSet', 'active'),
  (5, 'sensor-occidental-alta', 'Sensor Occidental Alta', 'Tribuna Occidental Alta', 'Simulado', 'active'),
  (6, 'sensor-occidental-baja', 'Sensor Occidental Baja', 'Tribuna Occidental Baja', 'Simulado', 'active'),
  (7, 'sensor-oriental', 'Sensor Oriental', 'Tribuna Oriental', 'Simulado', 'active'),
  (8, 'sensor-acceso-principal', 'Sensor Acceso Principal', 'Entrada Principal', 'Digital Twin', 'active'),
  (9, 'sensor-camerinos', 'Sensor Camerinos', 'Zona Interna Camerinos', 'Simulado', 'active'),
  (10, 'sensor-energia-estadio', 'Sensor Energia Estadio', 'Zona Tecnica', 'API/DataSet', 'active')
ON CONFLICT (device_code) DO UPDATE SET
  name = EXCLUDED.name,
  zone = EXCLUDED.zone,
  device_type = EXCLUDED.device_type;

INSERT INTO alert_rules (name, metric, operator, threshold, severity, enabled)
VALUES
  ('Temperatura critica en tribuna', 'temperature', 'gt', 35, 'critical', true),
  ('Ocupacion alta', 'occupancy', 'gt', 90, 'high', true),
  ('CO2 elevado', 'co2', 'gt', 1200, 'high', true),
  ('Voltaje fuera de rango alto', 'voltage', 'gt', 130, 'critical', true)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('devices', 'id'), COALESCE((SELECT MAX(id) FROM devices), 1), true);
