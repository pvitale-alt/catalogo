// Servicio para sincronizar datos de Redmine con la base de datos local
const { pool, query, transaction } = require('../config/database');
const redmineService = require('./redmineDirectService');

/**
 * Sincronizar issues de Redmine a la base de datos local
 * @param {string} project_id - ID del proyecto en Redmine
 * @param {string} tracker_id - ID del tracker (opcional, ej: '10' para Epic)
 * @param {number} maxTotal - Límite máximo de issues a sincronizar (null = sin límite)
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
async function sincronizarRedmine(project_id = 'ut-bancor', tracker_id = null, maxTotal = null) {
    console.log('\n🔄 =================================');
    console.log('   INICIANDO SINCRONIZACIÓN REDMINE');
    console.log('   =================================\n');
    
    // Si hay variable de entorno REDMINE_SYNC_LIMIT, usarla
    const limitFromEnv = process.env.REDMINE_SYNC_LIMIT ? parseInt(process.env.REDMINE_SYNC_LIMIT) : null;
    const limitFinal = maxTotal || limitFromEnv;
    
    if (limitFinal) {
        console.log(`⚠️ Modo prueba: limitado a ${limitFinal} issues\n`);
    }
    
    try {
        // 1. Obtener issues de Redmine
        console.log('📥 Paso 1: Obteniendo issues de Redmine...');
        const issuesMapeados = await redmineService.obtenerIssuesMapeados(project_id, tracker_id, limitFinal);
        
        if (issuesMapeados.length === 0) {
            console.log('⚠️ No se encontraron issues para sincronizar');
            return {
                success: true,
                message: 'No hay issues para sincronizar',
                insertados: 0,
                actualizados: 0,
                total: 0
            };
        }

        console.log(`✅ ${issuesMapeados.length} issues obtenidos de Redmine\n`);

        // 2. Insertar/actualizar en redmine_issues
        console.log('💾 Paso 2: Guardando issues en la base de datos...');
        
        let insertados = 0;
        let actualizados = 0;

        for (const issue of issuesMapeados) {
            try {
                const result = await query(`
                    INSERT INTO redmine_issues (
                        redmine_id, titulo, proyecto, fecha_creacion, sincronizado_en
                    ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                    ON CONFLICT (redmine_id) 
                    DO UPDATE SET
                        titulo = EXCLUDED.titulo,
                        proyecto = EXCLUDED.proyecto,
                        fecha_creacion = EXCLUDED.fecha_creacion,
                        sincronizado_en = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted
                `, [
                    issue.redmine_id,
                    issue.titulo,
                    issue.proyecto,
                    issue.fecha_creacion
                ]);

                // xmax = 0 significa que fue INSERT, xmax != 0 significa UPDATE
                if (result.rows[0].inserted) {
                    insertados++;
                } else {
                    actualizados++;
                }
            } catch (error) {
                console.error(`❌ Error al guardar issue ${issue.redmine_id}:`, error.message);
            }
        }

        console.log(`✅ Issues guardados: ${insertados} insertados, ${actualizados} actualizados\n`);

        // 3. Crear funcionalidades VACÍAS para issues nuevos
        console.log('🔄 Paso 3: Creando funcionalidades para issues nuevos...');
        
        const syncResult = await query(`
            -- Insertar funcionalidades vacías (solo redmine_id como referencia)
            -- Los datos editables se agregarán manualmente desde la UI
            INSERT INTO funcionalidades (
                redmine_id
            )
            SELECT 
                r.redmine_id
            FROM redmine_issues r
            WHERE NOT EXISTS (
                SELECT 1 FROM funcionalidades f WHERE f.redmine_id = r.redmine_id
            )
            RETURNING id, redmine_id;
        `);

        const funcionalidadesNuevas = syncResult.rowCount;
        
        console.log(`✅ ${funcionalidadesNuevas} funcionalidades nuevas creadas (vacías)\n`);

        // 4. NO actualizar funcionalidades existentes
        // Los datos editables (descripcion, seccion, monto, score) SIEMPRE persisten
        console.log('ℹ️ Funcionalidades existentes NO se actualizan (datos editables persisten)\n');

        console.log('🎉 =================================');
        console.log('   SINCRONIZACIÓN COMPLETADA');
        console.log('   =================================\n');

        return {
            success: true,
            message: 'Sincronización completada exitosamente',
            redmine_issues: {
                insertados,
                actualizados,
                total: issuesMapeados.length
            },
            funcionalidades: {
                nuevas: funcionalidadesNuevas,
                actualizadas: actualizados
            }
        };

    } catch (error) {
        console.error('\n❌ ERROR EN SINCRONIZACIÓN:', error.message);
        console.error('   Stack:', error.stack);
        
        return {
            success: false,
            message: 'Error en la sincronización',
            error: error.message
        };
    }
}

/**
 * Verificar estado de la sincronización
 * @returns {Promise<Object>} - Estado actual
 */
async function obtenerEstadoSincronizacion() {
    try {
        const result = await query(`
            SELECT 
                COUNT(*) as total_issues,
                MAX(sincronizado_en) as ultima_sincronizacion,
                COUNT(DISTINCT proyecto) as total_proyectos,
                COUNT(CASE WHEN estado_cerrado = false THEN 1 END) as issues_abiertos,
                COUNT(CASE WHEN estado_cerrado = true THEN 1 END) as issues_cerrados
            FROM redmine_issues
        `);

        const funcResult = await query(`
            SELECT 
                COUNT(*) as total_funcionalidades,
                COUNT(CASE WHEN redmine_id IS NOT NULL THEN 1 END) as con_redmine,
                COUNT(CASE WHEN redmine_id IS NULL THEN 1 END) as sin_redmine
            FROM funcionalidades
        `);

        return {
            success: true,
            redmine_issues: result.rows[0],
            funcionalidades: funcResult.rows[0]
        };
    } catch (error) {
        console.error('❌ Error al obtener estado:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    sincronizarRedmine,
    obtenerEstadoSincronizacion
};

