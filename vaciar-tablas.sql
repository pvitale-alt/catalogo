-- Script para vaciar todas las tablas y empezar de manera prolija
-- ⚠️ ADVERTENCIA: Esto eliminará TODOS los datos de las tablas

-- Desactivar temporalmente las restricciones de clave foránea
SET session_replication_role = 'replica';

-- Vaciar tablas en orden (respetando dependencias)
TRUNCATE TABLE score CASCADE;
TRUNCATE TABLE cliente_funcionalidad CASCADE;
TRUNCATE TABLE funcionalidades CASCADE;
TRUNCATE TABLE clientes CASCADE;
TRUNCATE TABLE redmine_issues CASCADE;

-- Reactivar restricciones
SET session_replication_role = 'origin';

-- Mensaje de confirmación
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ===================================';
    RAISE NOTICE '   TABLAS VACIADAS EXITOSAMENTE';
    RAISE NOTICE '   ===================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tablas limpiadas:';
    RAISE NOTICE '   - score';
    RAISE NOTICE '   - cliente_funcionalidad';
    RAISE NOTICE '   - funcionalidades';
    RAISE NOTICE '   - clientes';
    RAISE NOTICE '   - redmine_issues';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Próximos pasos:';
    RAISE NOTICE '   1. Reiniciar servidor para sincronizar issues desde Redmine';
    RAISE NOTICE '   2. Agregar clientes desde la solapa Clientes';
    RAISE NOTICE '   3. Calcular scores desde la calculadora';
    RAISE NOTICE '   4. Relacionar clientes con funcionalidades';
    RAISE NOTICE '';
END $$;

