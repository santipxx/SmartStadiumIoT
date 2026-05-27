CREATE TABLE IF NOT EXISTS alert_rules (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NULL REFERENCES devices(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    metric VARCHAR NOT NULL,
    operator VARCHAR NOT NULL DEFAULT 'gt',
    threshold DECIMAL(10, 2) NOT NULL,
    severity VARCHAR NOT NULL DEFAULT 'medium',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
