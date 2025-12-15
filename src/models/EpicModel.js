const { pool } = require('../config/database');

class EpicModel {
    /**
     * Obtener todos los epics de una funcionalidad
     * @param {string} funcionalidadRedmineId - ID del proyecto en Redmine (identifier)
     * @returns {Promise<Array>} - Array de epics
     */
    static async obtenerPorFuncionalidad(funcionalidadRedmineId) {
        try {
            const query = `
                SELECT *
                FROM epics_funcionalidad
                WHERE funcionalidad_redmine_id = $1
                ORDER BY fecha_inicio DESC, titulo ASC
            `;
            const result = await pool.query(query, [funcionalidadRedmineId]);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener epics:', error);
            throw error;
        }
    }

    /**
     * Guardar o actualizar epics de una funcionalidad
     * @param {string} funcionalidadRedmineId - ID del proyecto en Redmine (identifier)
     * @param {Array} epics - Array de epics desde Redmine
     * @returns {Promise<Object>} - Resultado de la operación
     */
    static async guardarEpics(funcionalidadRedmineId, epics) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Eliminar epics existentes de esta funcionalidad
            await client.query(
                'DELETE FROM epics_funcionalidad WHERE funcionalidad_redmine_id = $1',
                [funcionalidadRedmineId]
            );

            let insertados = 0;
            for (const epic of epics) {
                // Extraer fecha de finalización del custom field 15
                const fechaFinalizacion = epic.custom_fields?.find(cf => cf.id === 15)?.value || null;
                
                // Convertir fecha de finalización si existe
                let fechaFinalizacionDate = null;
                if (fechaFinalizacion) {
                    const fecha = new Date(fechaFinalizacion);
                    if (!isNaN(fecha.getTime())) {
                        fechaFinalizacionDate = fecha.toISOString().split('T')[0];
                    }
                }

                // Convertir fecha de inicio si existe
                let fechaInicioDate = null;
                if (epic.start_date) {
                    const fecha = new Date(epic.start_date);
                    if (!isNaN(fecha.getTime())) {
                        fechaInicioDate = fecha.toISOString().split('T')[0];
                    }
                }

                await client.query(`
                    INSERT INTO epics_funcionalidad (
                        funcionalidad_redmine_id,
                        epic_redmine_id,
                        titulo,
                        fecha_inicio,
                        horas_estimadas,
                        horas_dedicadas,
                        fecha_finalizacion
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    funcionalidadRedmineId,
                    epic.id,
                    epic.subject || 'Sin título',
                    fechaInicioDate,
                    epic.estimated_hours || null,
                    epic.total_spent_hours || null,
                    fechaFinalizacionDate
                ]);
                insertados++;
            }

            await client.query('COMMIT');

            return {
                success: true,
                insertados,
                message: `${insertados} epics guardados exitosamente`
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error al guardar epics:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obtener total de horas dedicadas de todos los epics de una funcionalidad
     * @param {string} funcionalidadRedmineId - ID del proyecto en Redmine (identifier)
     * @returns {Promise<number>} - Total de horas dedicadas
     */
    static async obtenerTotalHorasDedicadas(funcionalidadRedmineId) {
        try {
            const query = `
                SELECT COALESCE(SUM(horas_dedicadas), 0) AS total
                FROM epics_funcionalidad
                WHERE funcionalidad_redmine_id = $1
            `;
            const result = await pool.query(query, [funcionalidadRedmineId]);
            return parseFloat(result.rows[0].total) || 0;
        } catch (error) {
            console.error('Error al obtener total de horas dedicadas:', error);
            throw error;
        }
    }
}

module.exports = EpicModel;



