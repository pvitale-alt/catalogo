-- Crear tabla intermedia para relación muchos-a-muchos entre clientes y cliente_redmine
-- Fecha: 2025-01-XX

-- Crear tabla intermedia
CREATE TABLE IF NOT EXISTS cliente_cliente_redmine (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    cliente_redmine VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cliente_id, cliente_redmine)
);

COMMENT ON TABLE cliente_cliente_redmine IS 'Tabla intermedia para relacionar clientes con sus nombres en Redmine (muchos-a-muchos)';
COMMENT ON COLUMN cliente_cliente_redmine.cliente_id IS 'ID del cliente en la tabla clientes';
COMMENT ON COLUMN cliente_cliente_redmine.cliente_redmine IS 'Nombre del cliente en Redmine (truncado desde titulo)';

-- Crear índice para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_cliente_cliente_redmine_cliente_id ON cliente_cliente_redmine(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_cliente_redmine_cliente_redmine ON cliente_cliente_redmine(cliente_redmine);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_cliente_cliente_redmine_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cliente_cliente_redmine_updated_at
    BEFORE UPDATE ON cliente_cliente_redmine
    FOR EACH ROW
    EXECUTE FUNCTION update_cliente_cliente_redmine_updated_at();

