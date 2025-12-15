const { pool } = require('../config/database');

class ScoreIdeasModel {
    /**
     * Obtener score de una idea
     * @param {number} idea_id - ID de la idea
     */
    static async obtenerPorIdea(idea_id) {
        try {
            const query = 'SELECT * FROM score_ideas WHERE idea_id = $1';
            const result = await pool.query(query, [idea_id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener score:', error);
            throw error;
        }
    }

    /**
     * Actualizar score de una idea (solo criterios, mantiene pesos existentes)
     * @param {number} idea_id - ID de la idea
     * @param {Object} criterios - Criterios de evaluación
     */
    static async actualizar(idea_id, criterios) {
        try {
            // Verificar si existe el score
            let scoreExistente = await this.obtenerPorIdea(idea_id);
            
            if (!scoreExistente) {
                // Crear registro con pesos por defecto
                await this.actualizarPesos(idea_id, {
                    peso_facturacion: 40.00,
                    peso_facturacion_potencial: 20.00,
                    peso_impacto_cliente: 40.00,
                    peso_esfuerzo: 40.00,
                    peso_incertidumbre: 30.00,
                    peso_riesgo: 30.00
                });
                scoreExistente = await this.obtenerPorIdea(idea_id);
            }
            
            // Actualizar solo los criterios
            const query = `
                UPDATE score_ideas
                SET origen = $1,
                    facturacion = $2,
                    facturacion_potencial = $3,
                    impacto_cliente = $4,
                    esfuerzo = $5,
                    incertidumbre = $6,
                    riesgo = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE idea_id = $8
                RETURNING *
            `;
            const values = [
                criterios.origen || 0,
                criterios.facturacion || 0,
                criterios.facturacion_potencial || 0,
                criterios.impacto_cliente || 0,
                criterios.esfuerzo || 0,
                criterios.incertidumbre || 0,
                criterios.riesgo || 0,
                idea_id
            ];
            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al actualizar score:', error);
            throw error;
        }
    }

    /**
     * Actualizar pesos de criterios
     * @param {number} idea_id - ID de la idea
     * @param {Object} pesos - Pesos de los criterios
     */
    static async actualizarPesos(idea_id, pesos) {
        try {
            let score = await this.obtenerPorIdea(idea_id);
            
            if (!score) {
                // Crear score nuevo con pesos
                const insertQuery = `
                    INSERT INTO score_ideas (idea_id,
                        peso_origen, peso_facturacion, peso_facturacion_potencial, peso_impacto_cliente,
                        peso_esfuerzo, peso_incertidumbre, peso_riesgo)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                `;
                const insertValues = [
                    idea_id,
                    40.00, // peso_origen
                    40.00, // peso_facturacion
                    20.00, // peso_facturacion_potencial
                    40.00, // peso_impacto_cliente
                    40.00, // peso_esfuerzo
                    30.00, // peso_incertidumbre
                    30.00  // peso_riesgo
                ];
                const insertResult = await pool.query(insertQuery, insertValues);
                score = insertResult.rows[0];
            }
            
            // Actualizar pesos
            const query = `
                UPDATE score_ideas
                SET peso_origen = $1,
                    peso_facturacion = $2,
                    peso_facturacion_potencial = $3,
                    peso_impacto_cliente = $4,
                    peso_esfuerzo = $5,
                    peso_incertidumbre = $6,
                    peso_riesgo = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE idea_id = $8
                RETURNING *
            `;
            const values = [
                pesos.peso_origen || 40.00,
                pesos.peso_facturacion || 40.00,
                pesos.peso_facturacion_potencial || 20.00,
                pesos.peso_impacto_cliente || 40.00,
                pesos.peso_esfuerzo || 40.00,
                pesos.peso_incertidumbre || 30.00,
                pesos.peso_riesgo || 30.00,
                idea_id
            ];
            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al actualizar pesos:', error);
            throw error;
        }
    }

    /**
     * Eliminar score de una idea
     * @param {number} idea_id - ID de la idea
     */
    static async eliminar(idea_id) {
        try {
            const query = 'DELETE FROM score_ideas WHERE idea_id = $1 RETURNING *';
            const result = await pool.query(query, [idea_id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar score:', error);
            throw error;
        }
    }

    /**
     * Calcular score manualmente
     */
    static calcularScore(criterios, pesos) {
        const facturacion = parseFloat(criterios.facturacion) || 0;
        const facturacion_potencial = parseFloat(criterios.facturacion_potencial) || 0;
        const impacto_cliente = parseFloat(criterios.impacto_cliente) || 0;
        const esfuerzo = parseFloat(criterios.esfuerzo) || 0;
        const incertidumbre = parseFloat(criterios.incertidumbre) || 0;
        const riesgo = parseFloat(criterios.riesgo) || 0;
        
        const peso_facturacion = parseFloat(pesos.peso_facturacion || pesos.facturacion || 40);
        const peso_facturacion_potencial = parseFloat(pesos.peso_facturacion_potencial || pesos.facturacion_potencial || 20);
        const peso_impacto_cliente = parseFloat(pesos.peso_impacto_cliente || pesos.impacto_cliente || 40);
        const peso_esfuerzo = parseFloat(pesos.peso_esfuerzo || pesos.esfuerzo || 40);
        const peso_incertidumbre = parseFloat(pesos.peso_incertidumbre || pesos.incertidumbre || 30);
        const peso_riesgo = parseFloat(pesos.peso_riesgo || pesos.riesgo || 30);
        
        const sumaPonderadaPositivos = (
            (facturacion * peso_facturacion / 100) +
            (facturacion_potencial * peso_facturacion_potencial / 100) +
            (impacto_cliente * peso_impacto_cliente / 100)
        );
        const sumaPesosPositivos = peso_facturacion + peso_facturacion_potencial + peso_impacto_cliente;
        const promedioPositivos = sumaPesosPositivos > 0 ? sumaPonderadaPositivos / (sumaPesosPositivos / 100) : 0;
        
        const sumaPonderadaNegativos = (
            (esfuerzo * peso_esfuerzo / 100) +
            (incertidumbre * peso_incertidumbre / 100) +
            (riesgo * peso_riesgo / 100)
        );
        const sumaPesosNegativos = peso_esfuerzo + peso_incertidumbre + peso_riesgo;
        const promedioNegativos = sumaPesosNegativos > 0 ? sumaPonderadaNegativos / (sumaPesosNegativos / 100) : 0;
        
        const score = promedioPositivos - (promedioNegativos * 0.25);
        return parseFloat(score.toFixed(2));
    }
}

module.exports = ScoreIdeasModel;


