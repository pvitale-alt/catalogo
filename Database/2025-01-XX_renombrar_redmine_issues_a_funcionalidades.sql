-- Renombrar tabla redmine_issues a redmine_funcionalidades
-- Agregar campo cliente_redmine a tabla clientes
-- Actualizar campo cliente para que se trunque del titulo
-- Fecha: 2025-01-XX

-- 1. Renombrar tabla redmine_issues a redmine_funcionalidades
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'redmine_issues') THEN
        ALTER TABLE redmine_issues RENAME TO redmine_funcionalidades;
        RAISE NOTICE 'Tabla "redmine_issues" renombrada a "redmine_funcionalidades".';
    ELSE
        RAISE NOTICE 'La tabla "redmine_issues" no existe, no se realizó el renombrado.';
    END IF;
END $$;

-- 2. Renombrar secuencia si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'redmine_issues_id_seq') THEN
        ALTER SEQUENCE redmine_issues_id_seq RENAME TO redmine_funcionalidades_id_seq;
        RAISE NOTICE 'Secuencia "redmine_issues_id_seq" renombrada a "redmine_funcionalidades_id_seq".';
    END IF;
END $$;

-- 3. Renombrar constraint de primary key si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'redmine_issues_pkey' AND conrelid = 'redmine_funcionalidades'::regclass) THEN
        ALTER TABLE redmine_funcionalidades RENAME CONSTRAINT redmine_issues_pkey TO redmine_funcionalidades_pkey;
        RAISE NOTICE 'Constraint "redmine_issues_pkey" renombrado a "redmine_funcionalidades_pkey".';
    END IF;
END $$;

-- 4. Renombrar constraint unique si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'redmine_issues_redmine_id_key' AND conrelid = 'redmine_funcionalidades'::regclass) THEN
        ALTER TABLE redmine_funcionalidades RENAME CONSTRAINT redmine_issues_redmine_id_key TO redmine_funcionalidades_redmine_id_key;
        RAISE NOTICE 'Constraint "redmine_issues_redmine_id_key" renombrado a "redmine_funcionalidades_redmine_id_key".';
    END IF;
END $$;

-- 5. Actualizar campo cliente: truncar desde titulo en lugar de proyecto_completo
-- Ejemplo: "UT BH | Liquidación automática" -> "UT BH"
UPDATE redmine_funcionalidades
SET cliente = TRIM(SPLIT_PART(titulo, '|', 1))
WHERE titulo IS NOT NULL AND titulo LIKE '%|%';

-- Para títulos sin "|", usar el título completo (limitado a 255 caracteres)
UPDATE redmine_funcionalidades
SET cliente = SUBSTRING(titulo, 1, 255)
WHERE cliente IS NULL AND titulo IS NOT NULL;

-- 6. Agregar campo cliente_redmine a tabla clientes
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS cliente_redmine VARCHAR(255) NULL;

COMMENT ON COLUMN clientes.cliente_redmine IS 'Nombre del cliente en Redmine para mapear con el nombre de la web';

-- 7. Actualizar vista v_funcionalidades_completas si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_funcionalidades_completas') THEN
        DROP VIEW IF EXISTS v_funcionalidades_completas CASCADE;
        RAISE NOTICE 'Vista v_funcionalidades_completas eliminada, debe recrearse con el nuevo nombre de tabla';
    END IF;
END $$;

-- Recrear vista v_funcionalidades_completas
CREATE VIEW v_funcionalidades_completas AS
SELECT 
    -- Campos de redmine_funcionalidades (datos de Redmine)
    rf.redmine_id,
    rf.titulo,
    f.descripcion, -- Descripción ahora viene de la tabla 'funcionalidades'
    rf.cliente,    -- Cliente truncado desde titulo
    rf.fecha_creacion,
    rf.sponsor,
    rf.reventa,
    rf.total_spent_hours,
    rf.sincronizado_en,
    
    -- Campos de funcionalidades (datos editables locales)
    f.seccion,
    f.monto,
    f.created_at,
    f.updated_at,
    f.titulo_personalizado, -- Incluir titulo_personalizado
    
    -- Score calculado (si existe en la tabla score)
    s.score_calculado AS score_total
    
FROM redmine_funcionalidades rf
LEFT JOIN funcionalidades f ON rf.redmine_id = f.redmine_id
LEFT JOIN score s ON rf.redmine_id = s.funcionalidad_id;

COMMENT ON VIEW v_funcionalidades_completas IS 'Vista combinada que une datos de Redmine (redmine_funcionalidades) con datos locales editables (funcionalidades)';

