// Script para probar la conexión con Redmine
// Uso: node test-redmine.js

require('dotenv').config();
const redmineService = require('./src/services/redmineDirectService');

async function main() {
    console.log('\n🧪 ================================');
    console.log('   TEST DE CONEXIÓN REDMINE');
    console.log('   ================================\n');

    // Verificar variables de entorno
    console.log('1️⃣ Verificando variables de entorno...');
    console.log(`   REDMINE_URL: ${process.env.REDMINE_URL || '❌ NO CONFIGURADO'}`);
    console.log(`   REDMINE_TOKEN: ${process.env.REDMINE_TOKEN ? '✅ Configurado' : '❌ NO CONFIGURADO'}\n`);

    if (!process.env.REDMINE_TOKEN) {
        console.error('❌ ERROR: REDMINE_TOKEN no está configurado');
        console.log('\n📝 Pasos para configurar:');
        console.log('   1. Copia .env.example como .env');
        console.log('   2. Agrega tu API Key de Redmine');
        console.log('   3. Ejecuta nuevamente: node test-redmine.js\n');
        process.exit(1);
    }

    // Probar conexión
    console.log('2️⃣ Probando conexión con Redmine...');
    const conexionOk = await redmineService.probarConexion();

    if (!conexionOk) {
        console.error('\n❌ ERROR: No se pudo conectar con Redmine');
        console.log('\n📝 Verifica:');
        console.log('   1. Que tu API Key sea válida');
        console.log('   2. Que tengas permisos en el proyecto');
        console.log('   3. Que la URL de Redmine sea correcta\n');
        process.exit(1);
    }

    // Obtener issues de ejemplo
    console.log('\n3️⃣ Obteniendo issues de ejemplo...');
    try {
        const data = await redmineService.obtenerIssues({
            project_id: 'ut-bancor',
            limit: 3
        });

        console.log(`\n✅ ${data.issues.length} issues obtenidos:\n`);

        data.issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. #${issue.id} - ${issue.subject}`);
            console.log(`      Estado: ${issue.status.name}`);
            console.log(`      Tipo: ${issue.tracker.name}\n`);
        });

        // Mapear un issue
        console.log('4️⃣ Mapeando issue de ejemplo...');
        const issueMapeado = redmineService.mapearIssue(data.issues[0]);
        console.log('\n   Issue mapeado:');
        console.log(`      ID Redmine: ${issueMapeado.redmine_id}`);
        console.log(`      Título: ${issueMapeado.titulo}`);
        console.log(`      Proyecto: ${issueMapeado.proyecto}`);
        console.log(`      Sponsor: ${issueMapeado.sponsor || 'Sin sponsor'}`);
        console.log(`      Estado: ${issueMapeado.estado}`);
        console.log(`      Tipo: ${issueMapeado.tipo}\n`);

        console.log('🎉 ================================');
        console.log('   TEST COMPLETADO EXITOSAMENTE');
        console.log('   ================================\n');
        console.log('✅ La integración con Redmine está funcionando correctamente');
        console.log('\n📝 Siguiente paso:');
        console.log('   1. Ejecuta la migración: database-migration-redmine.sql en Neon');
        console.log('   2. Inicia el servidor: npm run dev');
        console.log('   3. La sincronización se hará automáticamente\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.log('\n📝 Verifica los logs arriba para más detalles\n');
        process.exit(1);
    }
}

main();

