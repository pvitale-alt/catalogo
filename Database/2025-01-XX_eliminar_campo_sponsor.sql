-- Eliminar campo sponsor de redmine_funcionalidades
-- Fecha: 2025-01-XX
-- 
-- El campo sponsor será reemplazado por el campo cliente (truncado desde titulo)

-- PASO 1: Eliminar primero la vista que depende de la columna sponsor
-- Esto eliminará todas las dependencias (vistas, funciones, etc.)
-- Usar CASCADE para eliminar todas las dependencias recursivamente
-- IMPORTANTE: Ejecutar esto primero y verificar que la vista se eliminó
DROP VIEW IF EXISTS v_funcionalidades_completas CASCADE;

-- PASO 2: Verificar que la vista fue eliminada y eliminar campo sponsor de la tabla
-- Usar CASCADE para eliminar cualquier dependencia restante que pueda quedar
-- PostgreSQL 9.2+ soporta DROP COLUMN IF EXISTS
DO $$ 
BEGIN
    -- Verificar si la columna existe antes de intentar eliminarla
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'redmine_funcionalidades' 
        AND column_name = 'sponsor'
    ) THEN
        -- Intentar eliminar la columna con CASCADE
        -- Esto debería funcionar si la vista fue eliminada correctamente
        ALTER TABLE redmine_funcionalidades DROP COLUMN sponsor CASCADE;
        RAISE NOTICE 'Campo sponsor eliminado exitosamente de redmine_funcionalidades';
    ELSE
        RAISE NOTICE 'Campo sponsor no existe en redmine_funcionalidades (ya fue eliminado)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al eliminar columna sponsor: %', SQLERRM;
        RAISE NOTICE 'Intenta ejecutar manualmente: DROP VIEW IF EXISTS v_funcionalidades_completas CASCADE;';
        RAISE;
END $$;

CREATE VIEW v_funcionalidades_completas AS
SELECT 
    -- Campos de redmine_funcionalidades (datos de Redmine)
    rf.redmine_id,
    rf.titulo,
    f.descripcion, -- Descripción ahora viene de la tabla 'funcionalidades'
    rf.cliente,    -- Cliente truncado desde titulo (se usa como sponsor)
    rf.fecha_creacion,
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

COMMENT ON VIEW v_funcionalidades_completas IS 'Vista combinada que une datos de Redmine (redmine_funcionalidades) con datos locales editables (funcionalidades). El campo cliente se usa como sponsor.';

