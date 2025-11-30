const { pool } = require('../config/database');

class ProyectosInternosModel {
    /**
     * Obtener todos los proyectos internos con sus scores
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
                FROM v_proyectos_internos_completos v
                LEFT JOIN score_backlog s ON v.redmine_id = s.funcionalidad_id
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;

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
            console.error('Error al obtener proyectos internos:', error);
            throw error;
        }
    }

    /**
     * Obtener proyecto interno por redmine_id con score
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
                FROM v_proyectos_internos_completos v
                LEFT JOIN score_backlog s ON v.redmine_id = s.funcionalidad_id
                WHERE v.redmine_id = $1
            `;
            const result = await pool.query(query, [redmine_id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener proyecto interno:', error);
            throw error;
        }
    }

    /**
     * Crear nuevo proyecto (solo datos editables)
     * NOTA: Los proyectos se crean automáticamente desde la sincronización
     * Este método solo actualiza los campos editables
     */
    static async crear(datos) {
        try {
            if (datos.redmine_id) {
                return await this.actualizar(datos.redmine_id, datos);
            }
            
            throw new Error('Los proyectos internos deben crearse desde la sincronización con Redmine');
        } catch (error) {
            console.error('Error al crear proyecto interno:', error);
            throw error;
        }
    }

    /**
     * Actualizar proyecto (solo campos editables)
     * @param {number} redmine_id - ID del issue en Redmine
     */
    static async actualizar(redmine_id, datos) {
        try {
            const query = `
                UPDATE proyectos_internos
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
            console.error('Error al actualizar proyecto interno:', error);
            throw error;
        }
    }

    /**
     * Eliminar proyecto
     * @param {number} redmine_id - ID del issue en Redmine
     */
    static async eliminar(redmine_id) {
        try {
            const query = 'DELETE FROM proyectos_internos WHERE redmine_id = $1 RETURNING *';
            const result = await pool.query(query, [redmine_id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar proyecto interno:', error);
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
                FROM proyectos_internos 
                WHERE seccion IS NOT NULL 
                ORDER BY seccion
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.seccion);
        } catch (error) {
            console.error('Error al obtener secciones de proyectos internos:', error);
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
                    COUNT(*) as total_proyectos,
                    AVG(COALESCE(s.score_calculado, 0)) as score_promedio,
                    COUNT(DISTINCT v.seccion) as total_secciones
                FROM v_proyectos_internos_completos v
                LEFT JOIN score_backlog s ON v.redmine_id = s.funcionalidad_id
            `;
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Error al obtener estadísticas de proyectos internos:', error);
            throw error;
        }
    }
}

module.exports = ProyectosInternosModel;



