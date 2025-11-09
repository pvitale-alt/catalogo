const { pool } = require('../config/database');

class ScoreModel {
    /**
     * Obtener score de una funcionalidad por redmine_id
     * @param {number} redmine_id - ID del issue en Redmine
     */
    static async obtenerPorFuncionalidad(redmine_id) {
        try {
            const query = 'SELECT * FROM score WHERE funcionalidad_id = $1';
            const result = await pool.query(query, [redmine_id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener score:', error);
            throw error;
        }
    }

    /**
     * Actualizar score de una funcionalidad por redmine_id
     * @param {number} redmine_id - ID del issue en Redmine
     */
    static async actualizar(redmine_id, criterios) {
        try {
            // Verificar si existe el score, si no, crearlo
            let score = await this.obtenerPorFuncionalidad(redmine_id);
            
            if (!score) {
                // Crear score nuevo
                const insertQuery = `
                    INSERT INTO score (funcionalidad_id, facturacion, urgencia, facturacion_potencial,
                        impacto_cliente, esfuerzo, incertidumbre, riesgo)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                `;
                const insertValues = [
                    redmine_id,
                    criterios.facturacion || 0,
                    criterios.urgencia || 0,
                    criterios.facturacion_potencial || 0,
                    criterios.impacto_cliente || 0,
                    criterios.esfuerzo || 0,
                    criterios.incertidumbre || 0,
                    criterios.riesgo || 0
                ];
                const insertResult = await pool.query(insertQuery, insertValues);
                return insertResult.rows[0];
            }
            
            // Actualizar score existente
            const query = `
                UPDATE score
                SET facturacion = $1,
                    urgencia = $2,
                    facturacion_potencial = $3,
                    impacto_cliente = $4,
                    esfuerzo = $5,
                    incertidumbre = $6,
                    riesgo = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE funcionalidad_id = $8
                RETURNING *
            `;
            const values = [
                criterios.facturacion || 0,
                criterios.urgencia || 0,
                criterios.facturacion_potencial || 0,
                criterios.impacto_cliente || 0,
                criterios.esfuerzo || 0,
                criterios.incertidumbre || 0,
                criterios.riesgo || 0,
                redmine_id
            ];
            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al actualizar score:', error);
            throw error;
        }
    }

    /**
     * Actualizar pesos de los criterios por redmine_id
     * @param {number} redmine_id - ID del issue en Redmine
     */
    static async actualizarPesos(redmine_id, pesos) {
        try {
            // Verificar si existe el score, si no, crearlo con valores por defecto
            let score = await this.obtenerPorFuncionalidad(redmine_id);
            
            if (!score) {
                // Crear score nuevo con valores por defecto
                const insertQuery = `
                    INSERT INTO score (funcionalidad_id)
                    VALUES ($1)
                    RETURNING *
                `;
                const insertResult = await pool.query(insertQuery, [redmine_id]);
                score = insertResult.rows[0];
            }
            
            // Actualizar pesos
            const query = `
                UPDATE score
                SET peso_facturacion = $1,
                    peso_urgencia = $2,
                    peso_facturacion_potencial = $3,
                    peso_impacto_cliente = $4,
                    peso_esfuerzo = $5,
                    peso_incertidumbre = $6,
                    peso_riesgo = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE funcionalidad_id = $8
                RETURNING *
            `;
            const values = [
                pesos.peso_facturacion || 40.00,
                pesos.peso_urgencia || 20.00,
                pesos.peso_facturacion_potencial || 20.00,
                pesos.peso_impacto_cliente || 20.00,
                pesos.peso_esfuerzo || 33.33,
                pesos.peso_incertidumbre || 33.33,
                pesos.peso_riesgo || 33.33,
                redmine_id
            ];
            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al actualizar pesos:', error);
            throw error;
        }
    }

    /**
     * Calcular score manualmente (útil para previsualizaciones)
     */
    static calcularScore(criterios, pesos) {
        // Criterios positivos (suman)
        const positivos = (
            (criterios.facturacion * pesos.peso_facturacion / 100) +
            (criterios.urgencia * pesos.peso_urgencia / 100) +
            (criterios.facturacion_potencial * pesos.peso_facturacion_potencial / 100) +
            (criterios.impacto_cliente * pesos.peso_impacto_cliente / 100)
        );
        
        // Criterios negativos (restan)
        const negativos = (
            (criterios.esfuerzo * pesos.peso_esfuerzo / 100) +
            (criterios.incertidumbre * pesos.peso_incertidumbre / 100) +
            (criterios.riesgo * pesos.peso_riesgo / 100)
        );
        
        const score = positivos - negativos;
        return parseFloat(score.toFixed(2));
    }

    /**
     * Obtener ranking de funcionalidades por score
     */
    static async obtenerRanking() {
        try {
            const query = `
                SELECT 
                    v.redmine_id,
                    v.titulo,
                    v.seccion,
                    v.sponsor,
                    s.score_calculado,
                    s.facturacion,
                    s.urgencia,
                    s.facturacion_potencial,
                    s.impacto_cliente,
                    s.esfuerzo,
                    s.incertidumbre,
                    s.riesgo
                FROM v_funcionalidades_completas v
                LEFT JOIN score s ON v.redmine_id = s.funcionalidad_id
                ORDER BY s.score_calculado DESC NULLS LAST
            `;
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener ranking:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de scores
     */
    static async obtenerEstadisticas() {
        try {
            const query = `
                SELECT 
                    AVG(score_calculado) as promedio,
                    MAX(score_calculado) as maximo,
                    MIN(score_calculado) as minimo,
                    AVG(facturacion) as promedio_facturacion,
                    AVG(urgencia) as promedio_urgencia,
                    AVG(facturacion_potencial) as promedio_facturacion_potencial,
                    AVG(impacto_cliente) as promedio_impacto_cliente,
                    AVG(esfuerzo) as promedio_esfuerzo,
                    AVG(incertidumbre) as promedio_incertidumbre,
                    AVG(riesgo) as promedio_riesgo
                FROM score
            `;
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Error al obtener estadísticas de scores:', error);
            throw error;
        }
    }
}

module.exports = ScoreModel;

