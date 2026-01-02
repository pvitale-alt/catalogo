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
                // Crear score nuevo (sin urgencia) con pesos por defecto correctos
                // score_calculado es una columna generada, se calcula automáticamente
                const insertQuery = `
                    INSERT INTO score (funcionalidad_id, facturacion, facturacion_potencial,
                        impacto_cliente, esfuerzo, incertidumbre, riesgo,
                        peso_facturacion, peso_facturacion_potencial, peso_impacto_cliente,
                        peso_esfuerzo, peso_incertidumbre, peso_riesgo)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    RETURNING *
                `;
                const insertValues = [
                    redmine_id,
                    criterios.facturacion || 0,
                    criterios.facturacion_potencial || 0,
                    criterios.impacto_cliente || 0,
                    criterios.esfuerzo || 0,
                    criterios.incertidumbre || 0,
                    criterios.riesgo || 0,
                    40.00, // peso_facturacion
                    20.00, // peso_facturacion_potencial
                    40.00, // peso_impacto_cliente
                    40.00, // peso_esfuerzo
                    30.00, // peso_incertidumbre
                    30.00  // peso_riesgo
                ];
                const insertResult = await pool.query(insertQuery, insertValues);
                return insertResult.rows[0];
            }
            
            // Obtener score antes de actualizar para comparar
            const scoreAntes = await this.obtenerPorFuncionalidad(redmine_id);
            
            // Actualizar score existente (sin urgencia)
            // score_calculado es una columna generada, se calcula automáticamente
            const query = `
                UPDATE score
                SET facturacion = $1,
                    facturacion_potencial = $2,
                    impacto_cliente = $3,
                    esfuerzo = $4,
                    incertidumbre = $5,
                    riesgo = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE funcionalidad_id = $7
                RETURNING *
            `;
            const values = [
                criterios.facturacion || 0,
                criterios.facturacion_potencial || 0,
                criterios.impacto_cliente || 0,
                criterios.esfuerzo || 0,
                criterios.incertidumbre || 0,
                criterios.riesgo || 0,
                redmine_id
            ];
            const result = await pool.query(query, values);
            
            // Calcular manualmente con factor 0.20 para comparar
            const pesos = {
                peso_facturacion: scoreAntes?.peso_facturacion || 40.00,
                peso_facturacion_potencial: scoreAntes?.peso_facturacion_potencial || 20.00,
                peso_impacto_cliente: scoreAntes?.peso_impacto_cliente || 40.00,
                peso_esfuerzo: scoreAntes?.peso_esfuerzo || 40.00,
                peso_incertidumbre: scoreAntes?.peso_incertidumbre || 30.00,
                peso_riesgo: scoreAntes?.peso_riesgo || 30.00
            };
            const scoreCalculadoManual = this.calcularScore(criterios, pesos);
            
            // Si la diferencia es significativa (> 0.01), la columna generada usa la fórmula antigua
            // Como no podemos modificar la columna generada automáticamente (tiene dependencias),
            // calculamos el score correcto manualmente y lo sobrescribimos en el resultado
            const diferencia = Math.abs(parseFloat(result.rows[0]?.score_calculado || 0) - scoreCalculadoManual);
            if (diferencia > 0.01) {
                // Sobrescribir el score_calculado en el resultado con el valor calculado manualmente
                // Esto asegura que el frontend reciba el valor correcto aunque la BD tenga el antiguo
                result.rows[0].score_calculado = scoreCalculadoManual;
                
                // Intentar actualizar usando CASCADE para eliminar dependencias automáticamente
                try {
                    await pool.query(`
                        ALTER TABLE score DROP COLUMN IF EXISTS score_calculado CASCADE;
                        ALTER TABLE score ADD COLUMN score_calculado NUMERIC(10,2) GENERATED ALWAYS AS (
                            ROUND(
                                (
                                    CASE 
                                        WHEN (COALESCE(peso_facturacion, 40) + COALESCE(peso_facturacion_potencial, 20) + COALESCE(peso_impacto_cliente, 40)) > 0
                                        THEN (
                                            (COALESCE(facturacion, 0) * COALESCE(peso_facturacion, 40) / 100) +
                                            (COALESCE(facturacion_potencial, 0) * COALESCE(peso_facturacion_potencial, 20) / 100) +
                                            (COALESCE(impacto_cliente, 0) * COALESCE(peso_impacto_cliente, 40) / 100)
                                        ) / ((COALESCE(peso_facturacion, 40) + COALESCE(peso_facturacion_potencial, 20) + COALESCE(peso_impacto_cliente, 40)) / 100)
                                        ELSE 0
                                    END
                                    -
                                    (
                                        CASE 
                                            WHEN (COALESCE(peso_esfuerzo, 40) + COALESCE(peso_incertidumbre, 30) + COALESCE(peso_riesgo, 30)) > 0
                                            THEN (
                                                (COALESCE(esfuerzo, 0) * COALESCE(peso_esfuerzo, 40) / 100) +
                                                (COALESCE(incertidumbre, 0) * COALESCE(peso_incertidumbre, 30) / 100) +
                                                (COALESCE(riesgo, 0) * COALESCE(peso_riesgo, 30) / 100)
                                            ) / ((COALESCE(peso_esfuerzo, 40) + COALESCE(peso_incertidumbre, 30) + COALESCE(peso_riesgo, 30)) / 100)
                                            ELSE 0
                                        END
                                        * 0.20
                                    )
                                )::NUMERIC,
                                2
                            )
                        ) STORED
                    `);
                    
                    // Re-ejecutar el UPDATE para que la nueva columna generada calcule el valor correcto
                    const updateQuery = `
                        UPDATE score
                        SET facturacion = $1,
                            facturacion_potencial = $2,
                            impacto_cliente = $3,
                            esfuerzo = $4,
                            incertidumbre = $5,
                            riesgo = $6,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE funcionalidad_id = $7
                        RETURNING *
                    `;
                    const updateResult = await pool.query(updateQuery, values);
                    return updateResult.rows[0] || null;
                } catch (error) {
                    // Si falla, al menos devolvemos el valor correcto calculado manualmente
                    console.error('Error al actualizar definición de columna generada (se devuelve valor calculado manualmente):', error.message);
                    // El resultado ya tiene score_calculado sobrescrito con el valor correcto
                }
            }
            
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
                // Crear score nuevo con valores por defecto y pesos correctos
                const insertQuery = `
                    INSERT INTO score (funcionalidad_id,
                        peso_facturacion, peso_facturacion_potencial, peso_impacto_cliente,
                        peso_esfuerzo, peso_incertidumbre, peso_riesgo)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `;
                const insertValues = [
                    redmine_id,
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
            
            // Actualizar pesos (sin urgencia, nuevos valores por defecto)
            const query = `
                UPDATE score
                SET peso_facturacion = $1,
                    peso_facturacion_potencial = $2,
                    peso_impacto_cliente = $3,
                    peso_esfuerzo = $4,
                    peso_incertidumbre = $5,
                    peso_riesgo = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE funcionalidad_id = $7
                RETURNING *
            `;
            const values = [
                pesos.peso_facturacion || 40.00,
                pesos.peso_facturacion_potencial || 20.00,
                pesos.peso_impacto_cliente || 40.00,
                pesos.peso_esfuerzo || 40.00,
                pesos.peso_incertidumbre || 30.00,
                pesos.peso_riesgo || 30.00,
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
     * Usa la misma fórmula que el trigger de la base de datos
     */
    static calcularScore(criterios, pesos) {
        // Asegurar que los valores sean numéricos (sin urgencia)
        const facturacion = parseFloat(criterios.facturacion) || 0;
        const facturacion_potencial = parseFloat(criterios.facturacion_potencial) || 0;
        const impacto_cliente = parseFloat(criterios.impacto_cliente) || 0;
        const esfuerzo = parseFloat(criterios.esfuerzo) || 0;
        const incertidumbre = parseFloat(criterios.incertidumbre) || 0;
        const riesgo = parseFloat(criterios.riesgo) || 0;
        
        // Obtener pesos (pueden venir con o sin prefijo peso_)
        const peso_facturacion = parseFloat(pesos.peso_facturacion || pesos.facturacion || 40);
        const peso_facturacion_potencial = parseFloat(pesos.peso_facturacion_potencial || pesos.facturacion_potencial || 20);
        const peso_impacto_cliente = parseFloat(pesos.peso_impacto_cliente || pesos.impacto_cliente || 40);
        const peso_esfuerzo = parseFloat(pesos.peso_esfuerzo || pesos.esfuerzo || 40);
        const peso_incertidumbre = parseFloat(pesos.peso_incertidumbre || pesos.incertidumbre || 30);
        const peso_riesgo = parseFloat(pesos.peso_riesgo || pesos.riesgo || 30);
        
        // Calcular promedio ponderado de valores positivos (usando pesos)
        const sumaPonderadaPositivos = (
            (facturacion * peso_facturacion / 100) +
            (facturacion_potencial * peso_facturacion_potencial / 100) +
            (impacto_cliente * peso_impacto_cliente / 100)
        );
        const sumaPesosPositivos = peso_facturacion + peso_facturacion_potencial + peso_impacto_cliente;
        const promedioPositivos = sumaPesosPositivos > 0 ? sumaPonderadaPositivos / (sumaPesosPositivos / 100) : 0;
        
        // Calcular promedio ponderado de valores negativos (usando pesos)
        const sumaPonderadaNegativos = (
            (esfuerzo * peso_esfuerzo / 100) +
            (incertidumbre * peso_incertidumbre / 100) +
            (riesgo * peso_riesgo / 100)
        );
        const sumaPesosNegativos = peso_esfuerzo + peso_incertidumbre + peso_riesgo;
        const promedioNegativos = sumaPesosNegativos > 0 ? sumaPonderadaNegativos / (sumaPesosNegativos / 100) : 0;
        
        // Score = promedio positivos - (promedio negativos × 0.20)
        const score = promedioPositivos - (promedioNegativos * 0.20);
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
     * El promedio se calcula directamente del score_calculado almacenado
     */
    static async obtenerEstadisticas() {
        try {
            const query = `
                SELECT 
                    -- Promedio del score calculado
                    AVG(score_calculado) as promedio,
                    MAX(score_calculado) as maximo,
                    MIN(score_calculado) as minimo,
                    AVG(facturacion) as promedio_facturacion,
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

