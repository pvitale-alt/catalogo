-- =========================================================
-- REESTRUCTURACIÓN FINAL: SEPARAR DATOS REDMINE VS EDITABLES
-- =========================================================

-- 1. LIMPIAR Y REESTRUCTURAR TABLA redmine_issues
-- Solo almacena datos de Redmine (no editables)
DROP TABLE IF EXISTS redmine_issues CASCADE;

CREATE TABLE redmine_issues (
    id SERIAL PRIMARY KEY,
    redmine_id INTEGER UNIQUE NOT NULL,
    titulo VARCHAR(500) NOT NULL,
    proyecto VARCHAR(255),
    fecha_creacion TIMESTAMP,
    sincronizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_redmine_issues_redmine_id ON redmine_issues(redmine_id);
CREATE INDEX idx_redmine_issues_proyecto ON redmine_issues(proyecto);

COMMENT ON TABLE redmine_issues IS 'Datos de Redmine (no editables) - se actualizan en cada sincronización';
COMMENT ON COLUMN redmine_issues.redmine_id IS 'ID del issue en Redmine (clave única)';

-- 2. REESTRUCTURAR TABLA funcionalidades
-- Solo datos editables del catálogo + referencia a redmine_id
DROP TABLE IF EXISTS funcionalidades CASCADE;

CREATE TABLE funcionalidades (
    id SERIAL PRIMARY KEY,
    redmine_id INTEGER UNIQUE NOT NULL, -- Referencia a redmine_issues
    -- Datos editables del catálogo
    descripcion TEXT, -- Descripción personalizada (editable)
    seccion VARCHAR(100), -- Categoría personalizada (editable)
    monto DECIMAL(12, 2), -- Monto del proyecto (editable)
    score_total DECIMAL(5, 2) DEFAULT 0, -- Score calculado
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (redmine_id) REFERENCES redmine_issues(redmine_id) ON DELETE CASCADE
);

CREATE INDEX idx_funcionalidades_redmine_id ON funcionalidades(redmine_id);
CREATE INDEX idx_funcionalidades_seccion ON funcionalidades(seccion);

COMMENT ON TABLE funcionalidades IS 'Datos editables del catálogo - persisten entre sincronizaciones';
COMMENT ON COLUMN funcionalidades.redmine_id IS 'Referencia al issue de Redmine';
COMMENT ON COLUMN funcionalidades.descripcion IS 'Descripción personalizada (sobrescribe la de Redmine si existe)';

-- 3. VACIAR Y REESTRUCTURAR TABLA clientes
-- Se gestiona manualmente desde la UI
TRUNCATE TABLE clientes CASCADE;

ALTER TABLE clientes DROP COLUMN IF EXISTS codigo;
ALTER TABLE clientes DROP COLUMN IF EXISTS activo;

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#0D5AA2';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

COMMENT ON TABLE clientes IS 'Clientes gestionados manualmente desde Mapa de Clientes';

-- 4. VACIAR Y REESTRUCTURAR TABLA cliente_funcionalidad
-- Solo relación cliente-funcionalidad + estado comercial
TRUNCATE TABLE cliente_funcionalidad CASCADE;

DROP TABLE IF EXISTS cliente_funcionalidad CASCADE;

CREATE TABLE cliente_funcionalidad (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    funcionalidad_id INTEGER NOT NULL, -- redmine_id de la funcionalidad
    estado_comercial VARCHAR(50) NOT NULL DEFAULT 'Planificado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    UNIQUE(cliente_id, funcionalidad_id)
);

CREATE INDEX idx_cliente_func_cliente ON cliente_funcionalidad(cliente_id);
CREATE INDEX idx_cliente_func_funcionalidad ON cliente_funcionalidad(funcionalidad_id);

COMMENT ON TABLE cliente_funcionalidad IS 'Relación cliente-funcionalidad gestionada desde Mapa de Clientes';
COMMENT ON COLUMN cliente_funcionalidad.funcionalidad_id IS 'redmine_id de la funcionalidad';

-- 5. VACIAR Y REESTRUCTURAR TABLA score
-- Se relaciona con redmine_id
TRUNCATE TABLE score CASCADE;

DROP TABLE IF EXISTS score CASCADE;

CREATE TABLE score (
    id SERIAL PRIMARY KEY,
    funcionalidad_id INTEGER NOT NULL, -- redmine_id de la funcionalidad
    -- Criterios de evaluación (valores de 0 a 5)
    origen INTEGER DEFAULT 0 CHECK (origen >= 0 AND origen <= 5),
    facturacion INTEGER DEFAULT 0 CHECK (facturacion >= 0 AND facturacion <= 5),
    urgencia INTEGER DEFAULT 0 CHECK (urgencia >= 0 AND urgencia <= 5),
    facturacion_potencial INTEGER DEFAULT 0 CHECK (facturacion_potencial >= 0 AND facturacion_potencial <= 5),
    impacto_cliente INTEGER DEFAULT 0 CHECK (impacto_cliente >= 0 AND impacto_cliente <= 5),
    esfuerzo INTEGER DEFAULT 0 CHECK (esfuerzo >= 0 AND esfuerzo <= 5),
    incertidumbre INTEGER DEFAULT 0 CHECK (incertidumbre >= 0 AND incertidumbre <= 5),
    riesgo INTEGER DEFAULT 0 CHECK (riesgo >= 0 AND riesgo <= 5),
    -- Pesos de cada criterio (%)
    peso_origen DECIMAL(5, 2) DEFAULT 40.00,
    peso_facturacion DECIMAL(5, 2) DEFAULT 20.00,
    peso_urgencia DECIMAL(5, 2) DEFAULT 20.00,
    peso_facturacion_potencial DECIMAL(5, 2) DEFAULT 20.00,
    peso_impacto_cliente DECIMAL(5, 2) DEFAULT 33.33,
    peso_esfuerzo DECIMAL(5, 2) DEFAULT 33.33,
    peso_incertidumbre DECIMAL(5, 2) DEFAULT 33.33,
    peso_riesgo DECIMAL(5, 2) DEFAULT 33.33,
    score_calculado DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(funcionalidad_id)
);

CREATE INDEX idx_score_funcionalidad ON score(funcionalidad_id);

COMMENT ON TABLE score IS 'Scores gestionados manualmente desde la calculadora de Score';
COMMENT ON COLUMN score.funcionalidad_id IS 'redmine_id de la funcionalidad';

-- 6. FUNCIÓN PARA ACTUALIZAR TIMESTAMP
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar timestamps
DROP TRIGGER IF EXISTS trigger_actualizar_timestamp_funcionalidades ON funcionalidades;
CREATE TRIGGER trigger_actualizar_timestamp_funcionalidades
BEFORE UPDATE ON funcionalidades
FOR EACH ROW
EXECUTE FUNCTION actualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_actualizar_timestamp_cliente_func ON cliente_funcionalidad;
CREATE TRIGGER trigger_actualizar_timestamp_cliente_func
BEFORE UPDATE ON cliente_funcionalidad
FOR EACH ROW
EXECUTE FUNCTION actualizar_timestamp();

-- 7. FUNCIÓN PARA CALCULAR SCORE
CREATE OR REPLACE FUNCTION calcular_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular score basado en los criterios y sus pesos
    NEW.score_calculado := (
        (NEW.origen * NEW.peso_origen / 100) +
        (NEW.facturacion * NEW.peso_facturacion / 100) +
        (NEW.urgencia * NEW.peso_urgencia / 100) +
        (NEW.facturacion_potencial * NEW.peso_facturacion_potencial / 100) +
        (NEW.impacto_cliente * NEW.peso_impacto_cliente / 100) +
        (NEW.esfuerzo * NEW.peso_esfuerzo / 100) +
        (NEW.incertidumbre * NEW.peso_incertidumbre / 100) +
        (NEW.riesgo * NEW.peso_riesgo / 100)
    );
    
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    -- Actualizar el score en la tabla funcionalidades
    UPDATE funcionalidades 
    SET score_total = NEW.score_calculado,
        updated_at = CURRENT_TIMESTAMP
    WHERE redmine_id = NEW.funcionalidad_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular automáticamente el score
DROP TRIGGER IF EXISTS trigger_calcular_score ON score;
CREATE TRIGGER trigger_calcular_score
BEFORE INSERT OR UPDATE ON score
FOR EACH ROW
EXECUTE FUNCTION calcular_score();

-- 8. VISTA COMBINADA (funcionalidades + redmine)
CREATE OR REPLACE VIEW v_funcionalidades_completas AS
SELECT 
    f.id,
    f.redmine_id,
    r.titulo,
    r.proyecto AS sponsor, -- El proyecto de Redmine es el sponsor
    f.descripcion,
    CONCAT('https://redmine.mercap.net/issues/', f.redmine_id) AS epic_redmine,
    f.seccion,
    f.monto,
    f.score_total,
    r.fecha_creacion,
    f.created_at,
    f.updated_at,
    r.sincronizado_en
FROM funcionalidades f
INNER JOIN redmine_issues r ON f.redmine_id = r.redmine_id;

COMMENT ON VIEW v_funcionalidades_completas IS 'Vista combinada: datos de Redmine + datos editables del catálogo';

-- 9. MENSAJE FINAL
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ===================================';
    RAISE NOTICE '   REESTRUCTURACIÓN COMPLETADA';
    RAISE NOTICE '   ===================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tablas reestructuradas:';
    RAISE NOTICE '   - redmine_issues (solo datos de Redmine)';
    RAISE NOTICE '   - funcionalidades (solo datos editables)';
    RAISE NOTICE '   - clientes (vacía, gestión manual)';
    RAISE NOTICE '   - cliente_funcionalidad (vacía)';
    RAISE NOTICE '   - score (vacía)';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Próximos pasos:';
    RAISE NOTICE '   1. Reiniciar servidor para sincronizar issues';
    RAISE NOTICE '   2. Agregar clientes desde Mapa de Clientes';
    RAISE NOTICE '   3. Calcular scores desde la calculadora';
    RAISE NOTICE '   4. Relacionar clientes con funcionalidades';
    RAISE NOTICE '';
END $$;

