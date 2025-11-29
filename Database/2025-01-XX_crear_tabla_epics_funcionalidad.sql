-- Crear tabla para almacenar epics de funcionalidades
-- Fecha: 2025-01-XX

CREATE TABLE IF NOT EXISTS epics_funcionalidad (
    id SERIAL PRIMARY KEY,
    funcionalidad_redmine_id VARCHAR(255) NOT NULL,
    epic_redmine_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    fecha_inicio DATE,
    horas_estimadas NUMERIC(10, 2),
    horas_dedicadas NUMERIC(10, 2),
    fecha_finalizacion DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(funcionalidad_redmine_id, epic_redmine_id)
);

COMMENT ON TABLE epics_funcionalidad IS 'Tabla para almacenar epics relacionados con funcionalidades';
COMMENT ON COLUMN epics_funcionalidad.funcionalidad_redmine_id IS 'ID del proyecto en Redmine (identifier)';
COMMENT ON COLUMN epics_funcionalidad.epic_redmine_id IS 'ID del epic en Redmine';
COMMENT ON COLUMN epics_funcionalidad.titulo IS 'Título del epic (subject)';
COMMENT ON COLUMN epics_funcionalidad.fecha_inicio IS 'Fecha de inicio (start_date)';
COMMENT ON COLUMN epics_funcionalidad.horas_estimadas IS 'Horas estimadas (estimated_hours)';
COMMENT ON COLUMN epics_funcionalidad.horas_dedicadas IS 'Horas dedicadas (total_spent_hours)';
COMMENT ON COLUMN epics_funcionalidad.fecha_finalizacion IS 'Fecha de finalización (custom field 15)';

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_epics_funcionalidad_funcionalidad ON epics_funcionalidad(funcionalidad_redmine_id);
CREATE INDEX IF NOT EXISTS idx_epics_funcionalidad_epic ON epics_funcionalidad(epic_redmine_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_epics_funcionalidad_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_epics_funcionalidad_updated_at
    BEFORE UPDATE ON epics_funcionalidad
    FOR EACH ROW
    EXECUTE FUNCTION update_epics_funcionalidad_updated_at();

