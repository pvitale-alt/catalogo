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
                    s.origen, s.facturacion, s.urgencia, s.facturacion_potencial,
                    s.impacto_cliente, s.esfuerzo, s.incertidumbre, s.riesgo,
                    s.score_calculado
                FROM v_funcionalidades_completas v
                LEFT JOIN score s ON v.redmine_id = s.funcionalidad_id
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;

            // Filtro por búsqueda
            if (filtros.busqueda) {
                query += ` AND (
                    v.titulo ILIKE $${paramCount} OR 
                    v.descripcion ILIKE $${paramCount} OR 
                    v.sponsor ILIKE $${paramCount} OR 
                    v.seccion ILIKE $${paramCount}
                )`;
                params.push(`%${filtros.busqueda}%`);
                paramCount++;
            }

            // Filtro por sección (compatibilidad con filtro único)
            if (filtros.seccion) {
                query += ` AND v.seccion = $${paramCount}`;
                params.push(filtros.seccion);
                paramCount++;
            }
            
            // Filtro por múltiples secciones
            if (filtros.secciones && filtros.secciones.length > 0) {
                query += ` AND v.seccion = ANY($${paramCount})`;
                params.push(filtros.secciones);
                paramCount++;
            }
            
            // Filtro por sponsor (compatibilidad con filtro único)
            if (filtros.sponsor) {
                query += ` AND v.sponsor = $${paramCount}`;
                params.push(filtros.sponsor);
                paramCount++;
            }
            
            // Filtro por múltiples sponsors
            if (filtros.sponsors && filtros.sponsors.length > 0) {
                query += ` AND v.sponsor = ANY($${paramCount})`;
                params.push(filtros.sponsors);
                paramCount++;
            }

            // Ordenamiento (por defecto: score_total DESC)
            const ordenValido = ['titulo', 'score_total', 'monto', 'fecha_creacion', 'created_at', 'epic_redmine', 'sponsor', 'seccion'];
            const orden = ordenValido.includes(filtros.orden) ? filtros.orden : 'score_total';
            const direccion = filtros.direccion === 'asc' ? 'ASC' : 'DESC';
            query += ` ORDER BY v.${orden} ${direccion} NULLS LAST`;

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
                    s.origen, s.facturacion, s.urgencia, s.facturacion_potencial,
                    s.impacto_cliente, s.esfuerzo, s.incertidumbre, s.riesgo,
                    s.score_calculado,
                    s.peso_origen, s.peso_facturacion, s.peso_urgencia, 
                    s.peso_facturacion_potencial, s.peso_impacto_cliente,
                    s.peso_esfuerzo, s.peso_incertidumbre, s.peso_riesgo
                FROM v_funcionalidades_completas v
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
            
            // Si no viene redmine_id, no se puede crear (debe venir de Redmine)
            throw new Error('Las funcionalidades deben crearse desde la sincronización con Redmine');
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
     * Obtener todos los sponsors únicos
     */
    static async obtenerSponsors() {
        try {
            const query = `
                SELECT DISTINCT sponsor
                FROM v_funcionalidades_completas
                WHERE sponsor IS NOT NULL AND sponsor != ''
                ORDER BY sponsor
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.sponsor);
        } catch (error) {
            console.error('Error al obtener sponsors:', error);
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
                    AVG(score_total) as score_promedio,
                    SUM(monto) as monto_total,
                    COUNT(DISTINCT seccion) as total_secciones
                FROM v_funcionalidades_completas
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

