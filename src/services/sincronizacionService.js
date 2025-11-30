// Servicio para sincronizar datos de Redmine con la base de datos local
const { pool, query, transaction } = require('../config/database');
const redmineService = require('./redmineDirectService');

const MAX_PROJECT_SYNC = 100;

/**
 * Sincronizar issues de Redmine a la base de datos local
 * @param {string} project_id - ID del proyecto en Redmine
 * @param {string} tracker_id - ID del tracker (opcional, ej: '10' para Epic)
 * @param {number} maxTotal - Límite máximo de issues a sincronizar (null = sin límite)
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
async function sincronizarRedmine(project_id = null, tracker_id = null, maxTotal = null) {
    // Si project_id es null o undefined, usar el valor por defecto
    project_id = project_id || process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor';
    console.log('\n🔄 =================================');
    console.log('   INICIANDO SINCRONIZACIÓN REDMINE');
    console.log('   =================================\n');
    console.log(`   Proyecto ID: ${project_id}`);
    console.log(`   Tracker ID: ${tracker_id || 'todos'}`);
    console.log(`   Límite: ${maxTotal || 'sin límite'}\n`);
    
    // Si hay variable de entorno REDMINE_SYNC_LIMIT, usarla
    const limitFromEnv = process.env.REDMINE_SYNC_LIMIT ? parseInt(process.env.REDMINE_SYNC_LIMIT) : null;
    const limiteSolicitado = maxTotal || limitFromEnv || MAX_PROJECT_SYNC;
    const limitFinal = Math.min(limiteSolicitado, MAX_PROJECT_SYNC);
    
    if (limiteSolicitado > MAX_PROJECT_SYNC) {
        console.log(`⚠️ Límite solicitado (${limiteSolicitado}) supera el máximo permitido (${MAX_PROJECT_SYNC}). Se usará ${MAX_PROJECT_SYNC}.`);
    }
    
    if (limitFinal) {
        console.log(`⚠️ Modo prueba: limitado a ${limitFinal} proyectos\n`);
    }
    
    try {
        // 1. Obtener proyectos de Redmine filtrados para el catálogo
        console.log('📥 Paso 1: Obteniendo proyectos de Redmine (catálogo)...');
        const proyectosMapeados = await redmineService.obtenerProyectosMapeados({
            limit: limitFinal
        });
        
        if (proyectosMapeados.length === 0) {
            console.log('⚠️ No se encontraron proyectos para sincronizar');
            return {
                success: true,
                message: 'No hay proyectos para sincronizar',
                insertados: 0,
                actualizados: 0,
                total: 0
            };
        }

        console.log(`✅ ${proyectosMapeados.length} proyectos obtenidos de Redmine\n`);

        // 2. Insertar/actualizar en redmine_funcionalidades
        console.log('💾 Paso 2: Guardando proyectos en la base de datos...');
        
        let insertados = 0;
        let actualizados = 0;

        for (const proyecto of proyectosMapeados) {
            try {
                const result = await query(`
                    INSERT INTO redmine_funcionalidades (
                        redmine_id, titulo, cliente, fecha_creacion, reventa, 
                        total_spent_hours, sincronizado_en
                    ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                    ON CONFLICT (redmine_id) 
                    DO UPDATE SET
                        titulo = EXCLUDED.titulo,
                        cliente = EXCLUDED.cliente,
                        fecha_creacion = EXCLUDED.fecha_creacion,
                        reventa = EXCLUDED.reventa,
                        total_spent_hours = EXCLUDED.total_spent_hours,
                        sincronizado_en = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted
                `, [
                    proyecto.redmine_id,
                    proyecto.titulo,
                    proyecto.cliente || null, // Cliente truncado desde titulo (ya viene del mapeo)
                    proyecto.fecha_creacion,
                    proyecto.reventa,
                    proyecto.total_spent_hours
                ]);
                
                // Log para debug: verificar que el cliente se esté guardando
                if (!proyecto.cliente && proyecto.titulo && proyecto.titulo !== 'Sin título') {
                    console.log(`⚠️ Cliente nulo para redmine_id ${proyecto.redmine_id}, título: "${proyecto.titulo}"`);
                } else if (proyecto.cliente) {
                    console.log(`✅ Cliente extraído: "${proyecto.cliente}" del título: "${proyecto.titulo}"`);
                }

                // xmax = 0 significa que fue INSERT, xmax != 0 significa UPDATE
                if (result.rows[0].inserted) {
                    insertados++;
                } else {
                    actualizados++;
                }
            } catch (error) {
                console.error(`❌ Error al guardar proyecto ${proyecto.redmine_id}:`, error.message);
            }
        }

        console.log(`✅ Proyectos guardados: ${insertados} insertados, ${actualizados} actualizados\n`);

        // 3. Crear funcionalidades VACÍAS para issues nuevos
        console.log('🔄 Paso 3: Creando funcionalidades para issues nuevos...');
        
        const syncResult = await query(`
            -- Insertar funcionalidades vacías (solo redmine_id como referencia)
            -- Los datos editables se agregarán manualmente desde la UI
            -- titulo_personalizado se inicializa con el título de Redmine
            INSERT INTO funcionalidades (
                redmine_id,
                titulo_personalizado
            )
            SELECT 
                r.redmine_id,
                r.titulo
            FROM redmine_funcionalidades r
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
            redmine_funcionalidades: {
                insertados,
                actualizados,
                total: proyectosMapeados.length
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
 * Sincronizar issues de Proyectos Internos desde Redmine
 * @param {string} tracker_id - ID del tracker (opcional, ej: '10' para Epic)
 * @param {number} maxTotal - Límite máximo de issues a sincronizar (null = sin límite)
 * @param {Array<string>} issueIds - IDs específicos a sincronizar
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
async function sincronizarProyectosInternos(tracker_id = null, maxTotal = null, cf23Override = null) {
    const INTERNAL_PROJECT_ID = process.env.REDMINE_INTERNAL_PROJECT || 'ut-mercap';
    const DEFAULT_TRACKER_ID = process.env.REDMINE_INTERNAL_TRACKER || process.env.REDMINE_DEFAULT_TRACKER || '19';
    const CF23_FILTER = cf23Override ?? process.env.REDMINE_INTERNAL_CF23 ?? '*';
    
    // Usar tracker_id por defecto si no se especifica
    const trackerIdFinal = tracker_id || DEFAULT_TRACKER_ID;
    
    // Limitar siempre a 100 resultados por request (requerimiento)
    const requestedLimit = maxTotal ? parseInt(maxTotal, 10) : 100;
    const limitFinal = Math.min(isNaN(requestedLimit) ? 100 : requestedLimit, 100);
    if (requestedLimit !== limitFinal) {
        console.log(`⚠️ Límite solicitado (${requestedLimit}) supera 100. Se usará ${limitFinal}.`);
    }
    
    console.log('\n🔄 =================================');
    console.log('   INICIANDO SINCRONIZACIÓN PROYECTOS INTERNOS');
    console.log('   =================================\n');
    console.log(`   Proyecto ID: ${INTERNAL_PROJECT_ID}`);
    console.log(`   Tracker ID: ${trackerIdFinal} (Epic)`);
    console.log(`   Custom Field 23: ${CF23_FILTER}`);
    console.log(`   Límite: ${limitFinal}\n`);
    
    try {
        // 1. Obtener issues de Redmine usando filtros
        console.log('📥 Paso 1: Obteniendo issues de Redmine...');
        const issuesMapeados = await redmineService.obtenerIssuesProyectosInternos({
            project_id: INTERNAL_PROJECT_ID,
            tracker_id: trackerIdFinal,
            cf_23: CF23_FILTER,
            limit: limitFinal
        });
        
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

        // 2. Insertar/actualizar en redmine_proyectos_internos
        console.log('💾 Paso 2: Guardando issues en la base de datos...');
        
        let insertados = 0;
        let actualizados = 0;

        for (const issue of issuesMapeados) {
            try {
                const result = await query(`
                    INSERT INTO redmine_proyectos_internos (
                        redmine_id, titulo, proyecto_completo, fecha_creacion, 
                        fecha_real_finalizacion, total_spent_hours, services_id, estado_redmine, sincronizado_en
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                    ON CONFLICT (redmine_id) 
                    DO UPDATE SET
                        titulo = EXCLUDED.titulo,
                        proyecto_completo = EXCLUDED.proyecto_completo,
                        fecha_creacion = EXCLUDED.fecha_creacion,
                        fecha_real_finalizacion = EXCLUDED.fecha_real_finalizacion,
                        total_spent_hours = EXCLUDED.total_spent_hours,
                        services_id = EXCLUDED.services_id,
                        estado_redmine = EXCLUDED.estado_redmine,
                        sincronizado_en = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted
                `, [
                    issue.redmine_id,
                    issue.titulo,
                    issue.proyecto_completo,
                    issue.fecha_creacion,
                    issue.fecha_real_finalizacion,
                    issue.total_spent_hours,
                    issue.services_id,
                    issue.estado_redmine
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

        // 3. Crear proyectos para issues nuevos
        console.log('🔄 Paso 3: Creando proyectos internos para issues nuevos...');
        
        const syncResult = await query(`
            INSERT INTO proyectos_internos (
                redmine_id,
                seccion
            )
            SELECT 
                r.redmine_id,
                NULL
            FROM redmine_proyectos_internos r
            WHERE NOT EXISTS (
                SELECT 1 FROM proyectos_internos b WHERE b.redmine_id = r.redmine_id
            )
            RETURNING id, redmine_id;
        `);

        const proyectosNuevos = syncResult.rowCount;
        
        console.log(`✅ ${proyectosNuevos} proyectos nuevos creados (vacíos)\n`);

        // 4. NO actualizar proyectos existentes
        // Los datos editables (descripcion, seccion, monto, score) SIEMPRE persisten
        console.log('ℹ️ Proyectos existentes NO se actualizan (datos editables persisten)\n');

        console.log('🎉 =================================');
        console.log('   SINCRONIZACIÓN PROYECTOS INTERNOS COMPLETADA');
        console.log('   =================================\n');

        return {
            success: true,
            message: 'Sincronización de proyectos internos completada exitosamente',
            redmine_proyectos_internos: {
                insertados,
                actualizados,
                total: issuesMapeados.length
            },
            proyectos_internos: {
                nuevos: proyectosNuevos,
                actualizados: actualizados
            }
        };

    } catch (error) {
        console.error('\n❌ ERROR EN SINCRONIZACIÓN PROYECTOS INTERNOS:', error.message);
        console.error('   Stack:', error.stack);
        
        return {
            success: false,
            message: 'Error en la sincronización de proyectos internos',
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
            FROM redmine_funcionalidades
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
            redmine_funcionalidades: result.rows[0],
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

/**
 * Sincronizar issues de Requerimientos de Clientes desde Redmine
 * ⚠️ SOLO CONSULTAS - No se realizan modificaciones en Redmine
 * @param {string} tracker_id - ID del tracker (opcional, default 29)
 * @param {number} maxTotal - Límite máximo de issues a sincronizar (null = sin límite)
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
async function sincronizarReqClientes(tracker_id = null, maxTotal = null) {
    const REQ_CLIENTES_PROJECT_ID = 'ut';
    const DEFAULT_TRACKER_ID = '29';
    const DEFAULT_STATUS_ID = '*';
    
    // Usar tracker_id por defecto si no se especifica
    const trackerIdFinal = tracker_id || DEFAULT_TRACKER_ID;
    
    // Limitar siempre a 100 resultados por request (requerimiento)
    const requestedLimit = maxTotal ? parseInt(maxTotal, 10) : 100;
    const limitFinal = Math.min(isNaN(requestedLimit) ? 100 : requestedLimit, 100);
    if (requestedLimit !== limitFinal) {
        console.log(`⚠️ Límite solicitado (${requestedLimit}) supera 100. Se usará ${limitFinal}.`);
    }
    
    console.log('\n🔄 =================================');
    console.log('   INICIANDO SINCRONIZACIÓN REQUERIMIENTOS CLIENTES');
    console.log('   =================================\n');
    console.log(`   Proyecto ID: ${REQ_CLIENTES_PROJECT_ID}`);
    console.log(`   Tracker ID: ${trackerIdFinal}`);
    console.log(`   Status ID: ${DEFAULT_STATUS_ID}`);
    console.log(`   Límite: ${limitFinal}`);
    console.log(`   ⚠️ SOLO CONSULTA - No se realizan modificaciones en Redmine\n`);
    
    try {
        // 1. Obtener issues de Redmine usando filtros
        console.log('📥 Paso 1: Obteniendo issues de Redmine (SOLO CONSULTA)...');
        const issuesMapeados = await redmineService.obtenerIssuesReqClientes({
            project_id: REQ_CLIENTES_PROJECT_ID,
            tracker_id: trackerIdFinal,
            status_id: DEFAULT_STATUS_ID,
            limit: limitFinal
        });
        
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

        // 2. Insertar/actualizar en redmine_req_clientes
        console.log('💾 Paso 2: Guardando issues en la base de datos...');
        console.log('   ⚠️ Validando que proyecto_completo no exista en redmine_funcionalidades...\n');
        
        let insertados = 0;
        let actualizados = 0;
        let omitidos = 0;

        for (const issue of issuesMapeados) {
            try {
                // Validar 1: Omitir si el proyecto es "UT Mercap | Mantenimiento"
                if (issue.proyecto_completo === 'UT Mercap | Mantenimiento') {
                    console.log(`   ⚠️ Omitiendo issue ${issue.redmine_id}: proyecto "${issue.proyecto_completo}" es de mantenimiento`);
                    omitidos++;
                    continue;
                }
                
                // Validar 2: Omitir si el proyecto_completo existe en redmine_funcionalidades.titulo (funcionalidades)
                if (issue.proyecto_completo) {
                    const validacion = await query(`
                        SELECT COUNT(*) as existe
                        FROM redmine_funcionalidades
                        WHERE titulo = $1
                    `, [issue.proyecto_completo]);
                    
                    if (parseInt(validacion.rows[0].existe) > 0) {
                        console.log(`   ⚠️ Omitiendo issue ${issue.redmine_id}: proyecto_completo "${issue.proyecto_completo}" ya existe en redmine_funcionalidades (funcionalidades)`);
                        omitidos++;
                        continue;
                    }
                }
                
                // Log para depuración de cf_91 y cf_92 antes de guardar
                if (issue.cf_91 || issue.cf_92) {
                    console.log(`   💾 Guardando issue ${issue.redmine_id}: cf_91="${issue.cf_91}", cf_92="${issue.cf_92}"`);
                }
                
                const result = await query(`
                    INSERT INTO redmine_req_clientes (
                        redmine_id, titulo, descripcion, proyecto_completo, cliente, fecha_creacion, 
                        fecha_real_finalizacion, total_spent_hours, estado_redmine, 
                        cf_91, cf_92, id_epic, sincronizado_en
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
                    ON CONFLICT (redmine_id) 
                    DO UPDATE SET
                        titulo = EXCLUDED.titulo,
                        descripcion = EXCLUDED.descripcion,
                        proyecto_completo = EXCLUDED.proyecto_completo,
                        cliente = EXCLUDED.cliente,
                        fecha_creacion = EXCLUDED.fecha_creacion,
                        fecha_real_finalizacion = EXCLUDED.fecha_real_finalizacion,
                        total_spent_hours = EXCLUDED.total_spent_hours,
                        estado_redmine = EXCLUDED.estado_redmine,
                        cf_91 = EXCLUDED.cf_91,
                        cf_92 = EXCLUDED.cf_92,
                        id_epic = EXCLUDED.id_epic,
                        sincronizado_en = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted
                `, [
                    issue.redmine_id,
                    issue.titulo,
                    issue.descripcion || null,
                    issue.proyecto_completo,
                    issue.cliente || null,
                    issue.fecha_creacion,
                    issue.fecha_real_finalizacion,
                    issue.total_spent_hours,
                    issue.estado_redmine,
                    issue.cf_91,
                    issue.cf_92,
                    issue.id_epic || null
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

        console.log(`✅ Issues guardados: ${insertados} insertados, ${actualizados} actualizados, ${omitidos} omitidos (proyecto_completo existe en redmine_funcionalidades)\n`);

        // 3. Crear requerimientos para issues nuevos
        console.log('🔄 Paso 3: Creando requerimientos de clientes para issues nuevos...');
        console.log('   ⚠️ Validando nuevamente que proyecto_completo no exista en redmine_funcionalidades...\n');
        
        const syncResult = await query(`
            INSERT INTO req_clientes (
                redmine_id,
                seccion
            )
            SELECT 
                r.redmine_id,
                NULL
            FROM redmine_req_clientes r
            WHERE NOT EXISTS (
                SELECT 1 FROM req_clientes b WHERE b.redmine_id = r.redmine_id
            )
            AND NOT EXISTS (
                SELECT 1 FROM redmine_funcionalidades ri 
                WHERE ri.titulo = r.proyecto_completo 
                AND r.proyecto_completo IS NOT NULL
            )
            RETURNING id, redmine_id;
        `);

        const requerimientosNuevos = syncResult.rowCount;
        
        console.log(`✅ ${requerimientosNuevos} requerimientos nuevos creados (vacíos)\n`);

        // 4. NO actualizar requerimientos existentes
        // Los datos editables (descripcion, seccion, monto, score) SIEMPRE persisten
        console.log('ℹ️ Requerimientos existentes NO se actualizan (datos editables persisten)\n');

        console.log('🎉 =================================');
        console.log('   SINCRONIZACIÓN REQUERIMIENTOS CLIENTES COMPLETADA');
        console.log('   =================================\n');

        return {
            success: true,
            message: 'Sincronización de requerimientos de clientes completada exitosamente',
            redmine_req_clientes: {
                insertados,
                actualizados,
                omitidos,
                total: issuesMapeados.length
            },
            req_clientes: {
                nuevos: requerimientosNuevos,
                actualizados: actualizados
            }
        };

    } catch (error) {
        console.error('\n❌ ERROR EN SINCRONIZACIÓN REQUERIMIENTOS CLIENTES:', error.message);
        console.error('   Stack:', error.stack);
        
        return {
            success: false,
            message: 'Error en la sincronización de requerimientos de clientes',
            error: error.message
        };
    }
}

module.exports = {
    sincronizarRedmine,
    sincronizarProyectosInternos,
    sincronizarReqClientes,
    obtenerEstadoSincronizacion
};

