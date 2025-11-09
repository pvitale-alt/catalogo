const { pool } = require('../config/database');

class MapaModel {
    /**
     * Obtener mapa completo (clientes x funcionalidades)
     */
    static async obtenerMapa() {
        try {
            // Obtener todos los clientes
            const queryClientes = 'SELECT * FROM clientes ORDER BY nombre';
            const resultClientes = await pool.query(queryClientes);
            
            // Obtener todas las funcionalidades desde la vista combinada
            const queryFuncionalidades = `
                SELECT v.*, s.score_calculado 
                FROM v_funcionalidades_completas v
                LEFT JOIN score s ON v.redmine_id = s.funcionalidad_id
                ORDER BY v.titulo
            `;
            const resultFuncionalidades = await pool.query(queryFuncionalidades);
            
            // Obtener todas las relaciones
            const queryRelaciones = `
                SELECT 
                    cliente_id,
                    funcionalidad_id,
                    estado_comercial,
                    created_at,
                    updated_at
                FROM cliente_funcionalidad
            `;
            const resultRelaciones = await pool.query(queryRelaciones);
            
            // Crear mapa de relaciones para acceso rápido
            const relacionesMap = {};
            resultRelaciones.rows.forEach(rel => {
                const key = `${rel.cliente_id}-${rel.funcionalidad_id}`;
                relacionesMap[key] = {
                    estado: rel.estado_comercial,
                    created_at: rel.created_at,
                    updated_at: rel.updated_at
                };
            });
            
            return {
                clientes: resultClientes.rows,
                funcionalidades: resultFuncionalidades.rows,
                relaciones: relacionesMap
            };
        } catch (error) {
            console.error('Error al obtener mapa:', error);
            throw error;
        }
    }

    /**
     * Actualizar estado comercial de cliente-funcionalidad
     * @param {number} clienteId - ID del cliente
     * @param {number} funcionalidadId - redmine_id de la funcionalidad
     */
    static async actualizarEstado(clienteId, funcionalidadId, datos) {
        try {
            const query = `
                INSERT INTO cliente_funcionalidad 
                (cliente_id, funcionalidad_id, estado_comercial)
                VALUES ($1, $2, $3)
                ON CONFLICT (cliente_id, funcionalidad_id) 
                DO UPDATE SET 
                    estado_comercial = $3,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const values = [
                clienteId,
                funcionalidadId, // redmine_id
                datos.estado_comercial || null // null por defecto
            ];
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            throw error;
        }
    }

    /**
     * Eliminar relación cliente-funcionalidad
     * @param {number} clienteId - ID del cliente
     * @param {number} funcionalidadId - redmine_id de la funcionalidad
     */
    static async eliminarRelacion(clienteId, funcionalidadId) {
        try {
            const query = `
                DELETE FROM cliente_funcionalidad 
                WHERE cliente_id = $1 AND funcionalidad_id = $2
                RETURNING *
            `;
            const result = await pool.query(query, [clienteId, funcionalidadId]); // funcionalidadId es redmine_id
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar relación:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas del mapa
     */
    static async obtenerEstadisticas() {
        try {
            const query = `
                SELECT 
                    estado_comercial,
                    COUNT(*) as cantidad
                FROM cliente_funcionalidad
                GROUP BY estado_comercial
                ORDER BY cantidad DESC
            `;
            const result = await pool.query(query);
            
            // Total de relaciones
            const queryTotal = 'SELECT COUNT(*) as total FROM cliente_funcionalidad';
            const resultTotal = await pool.query(queryTotal);
            
            return {
                por_estado: result.rows,
                total: resultTotal.rows[0].total
            };
        } catch (error) {
            console.error('Error al obtener estadísticas del mapa:', error);
            throw error;
        }
    }

    /**
     * Crear nuevo cliente
     */
    static async crearCliente(datos) {
        try {
            const query = `
                INSERT INTO clientes (nombre, color)
                VALUES ($1, $2)
                RETURNING *
            `;
            const values = [
                datos.nombre,
                datos.color || '#0D5AA2'
            ];
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error al crear cliente:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los clientes (incluyendo inactivos)
     */
    static async obtenerTodosLosClientes() {
        try {
            const query = 'SELECT * FROM clientes ORDER BY nombre';
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener clientes:', error);
            throw error;
        }
    }

    /**
     * Obtener clientes de una funcionalidad (por redmine_id)
     */
    /**
     * Obtener clientes de una funcionalidad (por redmine_id) con estado "productivo"
     */
    static async obtenerClientesPorFuncionalidad(redmine_id) {
        try {
            const query = `
                SELECT c.*
                FROM clientes c
                INNER JOIN cliente_funcionalidad cf ON c.id = cf.cliente_id
                WHERE cf.funcionalidad_id = $1 AND cf.estado_comercial = 'productivo'
                ORDER BY c.nombre
            `;
            const result = await pool.query(query, [redmine_id]);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener clientes por funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Agregar cliente a funcionalidad (productivo en)
     */
    static async agregarClienteAFuncionalidad(clienteId, redmineId, estadoComercial = null) {
        try {
            const query = `
                INSERT INTO cliente_funcionalidad (cliente_id, funcionalidad_id, estado_comercial)
                VALUES ($1, $2, $3)
                ON CONFLICT (cliente_id, funcionalidad_id) 
                DO UPDATE SET 
                    estado_comercial = $3,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const result = await pool.query(query, [clienteId, redmineId, estadoComercial]);
            return result.rows[0];
        } catch (error) {
            console.error('Error al agregar cliente a funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Eliminar cliente de funcionalidad
     */
    static async eliminarClienteDeFuncionalidad(clienteId, redmineId) {
        try {
            const query = `
                DELETE FROM cliente_funcionalidad 
                WHERE cliente_id = $1 AND funcionalidad_id = $2
                RETURNING *
            `;
            const result = await pool.query(query, [clienteId, redmineId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar cliente de funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Obtener funcionalidades más implementadas
     */
    static async obtenerTopFuncionalidades(limite = 10) {
        try {
            const query = `
                SELECT 
                    v.redmine_id,
                    v.titulo,
                    v.seccion,
                    v.sponsor,
                    COUNT(cf.id) as total_clientes,
                    COUNT(CASE WHEN cf.estado_comercial = 'Implementado' THEN 1 END) as implementados
                FROM v_funcionalidades_completas v
                LEFT JOIN cliente_funcionalidad cf ON v.redmine_id = cf.funcionalidad_id
                GROUP BY v.redmine_id, v.titulo, v.seccion, v.sponsor
                ORDER BY total_clientes DESC
                LIMIT $1
            `;
            const result = await pool.query(query, [limite]);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener top funcionalidades:', error);
            throw error;
        }
    }
}

module.exports = MapaModel;

