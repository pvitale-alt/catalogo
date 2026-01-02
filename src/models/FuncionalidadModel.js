const { pool } = require('../config/database');

class FuncionalidadModel {
    /**
     * Obtener todas las funcionalidades con sus scores
     * Usa la vista combinada que incluye datos de Redmine
     */
    static async obtenerTodas(filtros = {}) {
        try {
            let query = `
                SELECT 
                    v.*,
                    f.titulo_personalizado,
                    s.origen, s.facturacion, s.facturacion_potencial,
                    s.impacto_cliente, s.esfuerzo, s.incertidumbre, s.riesgo,
                    s.score_calculado
                FROM v_funcionalidades_completas v
                LEFT JOIN funcionalidades f ON v.redmine_id = f.redmine_id
                LEFT JOIN score s ON v.redmine_id = s.funcionalidad_id
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;

            // Filtro por búsqueda
            if (filtros.busqueda) {
                query += ` AND (
                    COALESCE(f.titulo_personalizado, v.titulo) ILIKE $${paramCount} OR 
                    v.titulo ILIKE $${paramCount} OR 
                    v.descripcion ILIKE $${paramCount} OR 
                    v.cliente ILIKE $${paramCount} OR 
                    f.seccion ILIKE $${paramCount}
                )`;
                params.push(`%${filtros.busqueda}%`);
                paramCount++;
            }

            // Filtro por sección (compatibilidad con filtro único)
            if (filtros.seccion) {
                query += ` AND f.seccion = $${paramCount}`;
                params.push(filtros.seccion);
                paramCount++;
            }
            
            // Filtro por múltiples secciones
            if (filtros.secciones && filtros.secciones.length > 0) {
                query += ` AND f.seccion = ANY($${paramCount})`;
                params.push(filtros.secciones);
                paramCount++;
            }
            
            // Filtro por sponsor (usando cliente)
            if (filtros.sponsor) {
                query += ` AND v.cliente = $${paramCount}`;
                params.push(filtros.sponsor);
                paramCount++;
            }
            
            // Filtro por múltiples sponsors (usando cliente)
            if (filtros.sponsors && filtros.sponsors.length > 0) {
                query += ` AND v.cliente = ANY($${paramCount})`;
                params.push(filtros.sponsors);
                paramCount++;
            }

            // Ordenamiento (por defecto: score_total DESC)
            // Nota: 'sponsor' ahora se ordena por 'cliente'
            const ordenValido = ['titulo', 'score_total', 'monto', 'fecha_creacion', 'created_at', 'epic_redmine', 'sponsor', 'seccion', 'cliente'];
            let orden = ordenValido.includes(filtros.orden) ? filtros.orden : 'score_total';
            
            // Mapear 'sponsor' a 'cliente' para ordenamiento
            if (orden === 'sponsor') {
                orden = 'cliente';
            }
            
            const direccion = filtros.direccion === 'asc' ? 'ASC' : 'DESC';
            
            // Manejar ordenamiento especial para score_total
            if (orden === 'score_total') {
                query += ` ORDER BY COALESCE(s.score_calculado, 0) ${direccion}`;
            } else if (orden === 'created_at') {
                // created_at está en la tabla funcionalidades, no en redmine_funcionalidades
                query += ` ORDER BY COALESCE(f.created_at, v.fecha_creacion) ${direccion} NULLS LAST`;
            } else if (orden === 'seccion') {
                // seccion está en la tabla funcionalidades, no en redmine_funcionalidades
                query += ` ORDER BY f.seccion ${direccion} NULLS LAST`;
            } else if (orden === 'fecha_creacion') {
                // fecha_creacion está en redmine_funcionalidades
                query += ` ORDER BY v.${orden} ${direccion} NULLS LAST`;
            } else {
                // Intentar primero en v, luego en f
                query += ` ORDER BY COALESCE(v.${orden}, f.${orden}) ${direccion} NULLS LAST`;
            }

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener funcionalidades:', error);
            throw error;
        }
    }

    /**
     * Obtener funcionalidad por redmine_id con score
     * @param {number} redmine_id - ID del issue en Redmine
     */
    static async obtenerPorId(redmine_id) {
        try {
            const query = `
                SELECT 
                    v.*,
                    f.titulo_personalizado,
                    s.origen, s.facturacion, s.facturacion_potencial,
                    s.impacto_cliente, s.esfuerzo, s.incertidumbre, s.riesgo,
                    s.score_calculado,
                    s.peso_origen, s.peso_facturacion, 
                    s.peso_facturacion_potencial, s.peso_impacto_cliente,
                    s.peso_esfuerzo, s.peso_incertidumbre, s.peso_riesgo
                FROM v_funcionalidades_completas v
                LEFT JOIN funcionalidades f ON v.redmine_id = f.redmine_id
                LEFT JOIN score s ON v.redmine_id = s.funcionalidad_id
                WHERE v.redmine_id = $1
            `;
            const result = await pool.query(query, [redmine_id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Crear nueva funcionalidad manualmente (puede incluir datos de Redmine)
     */
    static async crearManual(datos) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            let redmineId = null;
            
            // Verificar si se proporcionan datos de Redmine
            const tieneDatosRedmine = datos.redmine_id || datos.proyecto || datos.cliente || 
                                     datos.reventa !== null && datos.reventa !== '' || 
                                     datos.fecha_creacion || datos.total_spent_hours !== null;
            
            // Si se proporcionan datos de Redmine, crear registro en redmine_funcionalidades
            if (tieneDatosRedmine) {
                // Generar redmine_id si no se proporciona (usar números negativos para diferenciarlos de Redmine real)
                if (!datos.redmine_id) {
                    // Obtener el menor redmine_id negativo existente y restar 1
                    const minIdResult = await client.query(`
                        SELECT MIN(redmine_id) as min_id 
                        FROM redmine_funcionalidades 
                        WHERE redmine_id < 0
                    `);
                    const minId = minIdResult.rows[0]?.min_id || 0;
                    redmineId = minId - 1; // Generar un ID negativo único
                } else {
                    redmineId = parseInt(datos.redmine_id, 10);
                }
                
                const fechaCreacion = datos.fecha_creacion 
                    ? new Date(datos.fecha_creacion).toISOString() 
                    : new Date().toISOString();
                
                // Normalizar reventa (Si/No/null)
                let reventaNormalizada = null;
                if (datos.reventa && datos.reventa !== '') {
                    const reventaLower = datos.reventa.toLowerCase();
                    if (reventaLower === 'si' || reventaLower === 'yes' || reventaLower === 'true' || reventaLower === '1') {
                        reventaNormalizada = 'Si';
                    } else if (reventaLower === 'no' || reventaLower === 'false' || reventaLower === '0') {
                        reventaNormalizada = 'No';
                    }
                }
                
                await client.query(`
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
                `, [
                    redmineId,
                    datos.titulo || 'Sin título',
                    datos.cliente || datos.proyecto || null, // Soporta ambos nombres por compatibilidad
                    fechaCreacion,
                    reventaNormalizada,
                    datos.total_spent_hours || null
                ]);
            }
            
            // Crear funcionalidad (usar redmine_id si se creó en redmine_funcionalidades, sino NULL)
            const tituloPersonalizado = datos.titulo_personalizado || datos.titulo || null;
            
            const query = `
                INSERT INTO funcionalidades (redmine_id, titulo, descripcion, seccion, monto, titulo_personalizado, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING *
            `;
            
            const result = await client.query(query, [
                redmineId,
                datos.titulo,
                datos.descripcion || null,
                datos.seccion || null,
                datos.monto || null,
                tituloPersonalizado
            ]);
            
            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error al crear funcionalidad manual:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Crear nueva funcionalidad (solo datos editables)
     * NOTA: Las funcionalidades se crean automáticamente desde la sincronización
     * Este método solo actualiza los campos editables
     */
    static async crear(datos) {
        try {
            // Si viene redmine_id, actualizar la funcionalidad existente
            if (datos.redmine_id) {
                return await this.actualizar(datos.redmine_id, datos);
            }
            
            // Si no viene redmine_id, crear manualmente
            return await this.crearManual(datos);
        } catch (error) {
            console.error('Error al crear funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Actualizar funcionalidad (solo campos editables)
     * @param {number} redmine_id - ID del issue en Redmine
     */
    static async actualizar(redmine_id, datos) {
        try {
            const query = `
                UPDATE funcionalidades
                SET descripcion = $1,
                    seccion = $2,
                    monto = $3,
                    titulo_personalizado = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE redmine_id = $5
                RETURNING *
            `;
            const values = [
                datos.descripcion || null,
                datos.seccion || null,
                datos.monto ? parseFloat(datos.monto) : null,
                datos.titulo_personalizado || null,
                redmine_id
            ];
            const result = await pool.query(query, values);
            
            if (!result.rows[0]) {
                return null;
            }
            
            // Obtener datos completos desde la vista
            return await this.obtenerPorId(redmine_id);
        } catch (error) {
            console.error('Error al actualizar funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Eliminar funcionalidad
     * @param {number} redmine_id - ID del issue en Redmine
     */
    static async eliminar(redmine_id) {
        try {
            const query = 'DELETE FROM funcionalidades WHERE redmine_id = $1 RETURNING *';
            const result = await pool.query(query, [redmine_id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar funcionalidad:', error);
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
                FROM funcionalidades 
                WHERE seccion IS NOT NULL 
                ORDER BY seccion
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.seccion);
        } catch (error) {
            console.error('Error al obtener secciones:', error);
            throw error;
        }
    }
    
    /**
     * Obtener todos los sponsors únicos (usando cliente)
     */
    static async obtenerSponsors() {
        try {
            const query = `
                SELECT DISTINCT cliente AS sponsor
                FROM v_funcionalidades_completas
                WHERE cliente IS NOT NULL AND cliente != ''
                ORDER BY cliente
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.sponsor);
        } catch (error) {
            console.error('Error al obtener sponsors:', error);
            throw error;
        }
    }

    /**
     * Obtener funcionalidad por sponsor (código del proyecto)
     * El sponsor es el código del proyecto (identifier) de Redmine
     * @param {string} sponsor - Código del proyecto (ej: "ut-bancor-ext-49213")
     * @returns {Promise<Object|null>} - Funcionalidad encontrada o null
     */
    static async obtenerPorSponsor(sponsor) {
        try {
            if (!sponsor) {
                return null;
            }
            
            const sponsorNormalizado = String(sponsor).trim();
            
            // Buscar por redmine_id (puede ser el identifier del proyecto) o por cliente
            const query = `
                SELECT 
                    v.*,
                    f.titulo_personalizado,
                    s.score_calculado
                FROM v_funcionalidades_completas v
                LEFT JOIN funcionalidades f ON v.redmine_id = f.redmine_id
                LEFT JOIN score s ON v.redmine_id = s.funcionalidad_id
                WHERE TRIM(v.cliente) = TRIM($1)
                   OR CAST(v.redmine_id AS TEXT) = $1
                ORDER BY v.redmine_id DESC
                LIMIT 1
            `;
            const result = await pool.query(query, [sponsorNormalizado]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener funcionalidad por sponsor:', error);
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
                    COUNT(*) as total_funcionalidades,
                    AVG(COALESCE(s.score_calculado, 0)) as score_promedio,
                    SUM(COALESCE(f.monto, 0)) as monto_total,
                    COUNT(DISTINCT f.seccion) as total_secciones
                FROM v_funcionalidades_completas v
                LEFT JOIN funcionalidades f ON v.redmine_id = f.redmine_id
                LEFT JOIN score s ON v.redmine_id = s.funcionalidad_id
            `;
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            throw error;
        }
    }
}

module.exports = FuncionalidadModel;

