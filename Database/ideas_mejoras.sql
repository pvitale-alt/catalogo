-- ============================================
-- Tabla: ideas_mejoras
-- Descripción: Almacena ideas y mejoras del catálogo
-- Sin integración con Redmine - carga manual
-- ============================================

-- Crear tabla principal
CREATE TABLE IF NOT EXISTS ideas_mejoras (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(500) NOT NULL,
    descripcion TEXT,
    seccion VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ideas_mejoras_seccion ON ideas_mejoras(seccion);
CREATE INDEX IF NOT EXISTS idx_ideas_mejoras_fecha_creacion ON ideas_mejoras(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_ideas_mejoras_titulo ON ideas_mejoras USING gin(to_tsvector('spanish', titulo));

-- Agregar tabla score_ideas para el scoring
CREATE TABLE IF NOT EXISTS score_ideas (
    id SERIAL PRIMARY KEY,
    idea_id INTEGER NOT NULL REFERENCES ideas_mejoras(id) ON DELETE CASCADE,
    origen NUMERIC(3,1) DEFAULT 0,
    facturacion NUMERIC(3,1) DEFAULT 0,
    facturacion_potencial NUMERIC(3,1) DEFAULT 0,
    impacto_cliente NUMERIC(3,1) DEFAULT 0,
    esfuerzo NUMERIC(3,1) DEFAULT 0,
    incertidumbre NUMERIC(3,1) DEFAULT 0,
    riesgo NUMERIC(3,1) DEFAULT 0,
    peso_origen NUMERIC(5,2) DEFAULT 40.00,
    peso_facturacion NUMERIC(5,2) DEFAULT 40.00,
    peso_facturacion_potencial NUMERIC(5,2) DEFAULT 20.00,
    peso_impacto_cliente NUMERIC(5,2) DEFAULT 40.00,
    peso_esfuerzo NUMERIC(5,2) DEFAULT 40.00,
    peso_incertidumbre NUMERIC(5,2) DEFAULT 30.00,
    peso_riesgo NUMERIC(5,2) DEFAULT 30.00,
    score_calculado NUMERIC(5,2) GENERATED ALWAYS AS (
        (
            (COALESCE(facturacion, 0) * peso_facturacion / 100) +
            (COALESCE(facturacion_potencial, 0) * peso_facturacion_potencial / 100) +
            (COALESCE(impacto_cliente, 0) * peso_impacto_cliente / 100)
        ) / ((peso_facturacion + peso_facturacion_potencial + peso_impacto_cliente) / 100)
        -
        (
            (
                (COALESCE(esfuerzo, 0) * peso_esfuerzo / 100) +
                (COALESCE(incertidumbre, 0) * peso_incertidumbre / 100) +
                (COALESCE(riesgo, 0) * peso_riesgo / 100)
            ) / ((peso_esfuerzo + peso_incertidumbre + peso_riesgo) / 100)
        ) * 0.25
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(idea_id)
);

-- Índice para búsquedas por idea_id
CREATE INDEX IF NOT EXISTS idx_score_ideas_idea_id ON score_ideas(idea_id);

-- Comentarios de documentación
COMMENT ON TABLE ideas_mejoras IS 'Tabla para almacenar ideas y mejoras del catálogo (carga manual sin Redmine)';
COMMENT ON COLUMN ideas_mejoras.titulo IS 'Título de la idea/mejora';
COMMENT ON COLUMN ideas_mejoras.descripcion IS 'Descripción detallada de la idea';
COMMENT ON COLUMN ideas_mejoras.seccion IS 'Sección a la que pertenece (Operatorias, Backoffice, etc.)';
COMMENT ON COLUMN ideas_mejoras.fecha_creacion IS 'Fecha en que se creó la idea';

COMMENT ON TABLE score_ideas IS 'Tabla para scoring de ideas/mejoras - misma lógica que score_backlog';

