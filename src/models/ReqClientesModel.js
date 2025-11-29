const { pool } = require('../config/database');

class ReqClientesModel {
    /**
     * Obtener todos los requerimientos de clientes con sus scores
     * Usa la vista combinada que incluye datos de Redmine
     */
    static async obtenerTodas(filtros = {}) {
        try {
            let query = `
                SELECT 
                    v.*,
                    s.origen, s.facturacion, s.facturacion_potencial,
                    s.impacto_cliente, s.esfuerzo, s.incertidumbre, s.riesgo,
                    s.score_calculado,
                    COALESCE(s.score_calculado, 0) AS score_total
                FROM v_req_clientes_completos v
                LEFT JOIN score_backlog s ON v.redmine_id = s.funcionalidad_id
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;

            // Filtrar por oculto: por defecto no mostrar ocultos, a menos que mostrarOcultos esté activado
            if (!filtros.mostrarOcultos) {
                query += ` AND (COALESCE(v.oculto, FALSE) = FALSE)`;
            }

            if (filtros.busqueda) {
                query += ` AND (
                    v.titulo ILIKE $${paramCount} OR 
                    v.descripcion ILIKE $${paramCount} OR 
                    v.seccion ILIKE $${paramCount}
                )`;
                params.push(`%${filtros.busqueda}%`);
                paramCount++;
            }

            if (filtros.seccion) {
                query += ` AND v.seccion = $${paramCount}`;
                params.push(filtros.seccion);
                paramCount++;
            }
            
            if (filtros.secciones && filtros.secciones.length > 0) {
                query += ` AND v.seccion = ANY($${paramCount})`;
                params.push(filtros.secciones);
                paramCount++;
            }
            
            const ordenValido = ['titulo', 'score_total', 'fecha_creacion', 'created_at', 'seccion'];
            const orden = ordenValido.includes(filtros.orden) ? filtros.orden : 'score_total';
            const direccion = filtros.direccion === 'asc' ? 'ASC' : 'DESC';
            const ordenColumn = orden === 'score_total' ? orden : `v.${orden}`;
            query += ` ORDER BY ${ordenColumn} ${direccion} NULLS LAST`;

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener requerimientos de clientes:', error);
            throw error;
        }
    }

    /**
     * Obtener requerimiento de cliente por redmine_id con score
     * @param {number} redmine_id - ID del issue en Redmine
     */
    static async obtenerPorId(redmine_id) {
        try {
            const query = `
                SELECT 
                    v.*,
                    s.origen, s.facturacion, s.facturacion_potencial,
                    s.impacto_cliente, s.esfuerzo, s.incertidumbre, s.riesgo,
                    s.score_calculado,
                    s.peso_origen, s.peso_facturacion, 
                    s.peso_facturacion_potencial, s.peso_impacto_cliente,
                    s.peso_esfuerzo, s.peso_incertidumbre, s.peso_riesgo
                FROM v_req_clientes_completos v
                LEFT JOIN score_backlog s ON v.redmine_id = s.funcionalidad_id
                WHERE v.redmine_id = $1
            `;
            const result = await pool.query(query, [redmine_id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener requerimiento de cliente:', error);
            throw error;
        }
    }

    /**
     * Crear nuevo requerimiento (solo datos editables)
     * NOTA: Los requerimientos se crean automáticamente desde la sincronización
     * Este método solo actualiza los campos editables
     */
    static async crear(datos) {
        try {
            if (datos.redmine_id) {
                return await this.actualizar(datos.redmine_id, datos);
            }
            
            throw new Error('Los requerimientos de clientes deben crearse desde la sincronización con Redmine');
        } catch (error) {
            console.error('Error al crear requerimiento de cliente:', error);
            throw error;
        }
    }

    /**
     * Actualizar requerimiento (solo campos editables)
     * @param {number} redmine_id - ID del issue en Redmine
     */
    static async actualizar(redmine_id, datos) {
        try {
            const query = `
                UPDATE req_clientes
                SET descripcion = $1,
                    seccion = $2,
                    monto = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE redmine_id = $4
                RETURNING *
            `;
            const values = [
                datos.descripcion || null,
                datos.seccion || null,
                datos.monto ? parseFloat(datos.monto) : null,
                redmine_id
            ];
            const result = await pool.query(query, values);
            
            if (!result.rows[0]) {
                return null;
            }
            
            return await this.obtenerPorId(redmine_id);
        } catch (error) {
            console.error('Error al actualizar requerimiento de cliente:', error);
            throw error;
        }
    }

    /**
     * Eliminar requerimiento
     * @param {number} redmine_id - ID del issue en Redmine
     */
    static async eliminar(redmine_id) {
        try {
            const query = 'DELETE FROM req_clientes WHERE redmine_id = $1 RETURNING *';
            const result = await pool.query(query, [redmine_id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar requerimiento de cliente:', error);
            throw error;
        }
    }

    /**
     * Obtener secciones únicas
     */
    static async obtenerSecciones() {
        try {
            const query = `
                SELECT DISTINCT seccion 
                FROM req_clientes 
                WHERE seccion IS NOT NULL 
                ORDER BY seccion
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.seccion);
        } catch (error) {
            console.error('Error al obtener secciones de requerimientos de clientes:', error);
            throw error;
        }
    }
    
    /**
     * Obtener estadísticas
     */
    static async obtenerEstadisticas() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_requerimientos,
                    AVG(COALESCE(s.score_calculado, 0)) as score_promedio,
                    COUNT(DISTINCT v.seccion) as total_secciones
                FROM v_req_clientes_completos v
                LEFT JOIN score_backlog s ON v.redmine_id = s.funcionalidad_id
            `;
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Error al obtener estadísticas de requerimientos de clientes:', error);
            throw error;
        }
    }

    /**
     * Obtener requerimientos de clientes por sponsor (cf_92)
     * @param {string} sponsor - Código del proyecto (sponsor)
     * @returns {Promise<Array>} - Array de requerimientos de clientes
     */
    static async obtenerPorSponsor(sponsor) {
        try {
            if (!sponsor) {
                return [];
            }
            
            // Normalizar el sponsor: trim y convertir a string
            const sponsorNormalizado = String(sponsor).trim();
            
            console.log(`🔍 Buscando req clientes con cf_92="${sponsorNormalizado}"`);
            
            // Consulta de depuración: ver todos los valores de cf_92 que existen
            const debugQuery = `
                SELECT DISTINCT cf_92, COUNT(*) as cantidad
                FROM v_req_clientes_completos
                WHERE cf_92 IS NOT NULL
                GROUP BY cf_92
                ORDER BY cf_92
            `;
            const debugResult = await pool.query(debugQuery);
            console.log(`📊 Valores de cf_92 en BD: ${debugResult.rows.map(r => `"${r.cf_92}" (${r.cantidad})`).join(', ')}`);
            
            // Búsqueda case-insensitive y con trim
            const query = `
                SELECT 
                    v.*,
                    s.score_calculado,
                    COALESCE(s.score_calculado, 0) AS score_total
                FROM v_req_clientes_completos v
                LEFT JOIN score_backlog s ON v.redmine_id = s.funcionalidad_id
                WHERE TRIM(v.cf_92) = TRIM($1)
                ORDER BY v.titulo ASC
            `;
            const result = await pool.query(query, [sponsorNormalizado]);
            
            console.log(`✅ Encontrados ${result.rows.length} req clientes con cf_92="${sponsorNormalizado}"`);
            if (result.rows.length > 0) {
                console.log(`   Req encontrados: ${result.rows.map(r => `${r.titulo} (cf_92="${r.cf_92}")`).join(', ')}`);
            } else {
                console.log(`   ⚠️ No se encontraron req clientes. Verificar que el valor "${sponsorNormalizado}" coincida exactamente con algún cf_92 en la BD.`);
            }
            
            return result.rows;
        } catch (error) {
            console.error('Error al obtener requerimientos por sponsor:', error);
            throw error;
        }
    }

    /**
     * Ocultar o mostrar un requerimiento de cliente
     * @param {number} redmine_id - ID del issue en Redmine
     * @param {boolean} oculto - true para ocultar, false para mostrar
     * @returns {Promise<Object>} - Requerimiento actualizado
     */
    static async ocultar(redmine_id, oculto) {
        try {
            // Primero verificar si existe el registro en req_clientes
            const existeQuery = `SELECT id FROM req_clientes WHERE redmine_id = $1`;
            const existeResult = await pool.query(existeQuery, [redmine_id]);
            
            if (existeResult.rows.length === 0) {
                // Si no existe, crear el registro
                const insertQuery = `
                    INSERT INTO req_clientes (redmine_id, oculto)
                    VALUES ($1, $2)
                    RETURNING *
                `;
                const insertResult = await pool.query(insertQuery, [redmine_id, oculto]);
                return insertResult.rows[0];
            } else {
                // Si existe, actualizar
                const updateQuery = `
                    UPDATE req_clientes
                    SET oculto = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE redmine_id = $2
                    RETURNING *
                `;
                const updateResult = await pool.query(updateQuery, [oculto, redmine_id]);
                return updateResult.rows[0];
            }
        } catch (error) {
            console.error('Error al ocultar/mostrar requerimiento:', error);
            throw error;
        }
    }
}

module.exports = ReqClientesModel;

