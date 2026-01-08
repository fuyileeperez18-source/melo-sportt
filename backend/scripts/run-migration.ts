import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { query, pool } from '../config/database.js';

async function runMigration() {
  const migrationName = process.argv[2];

  // Si no se especifica nombre, ejecutar todas las migraciones
  if (!migrationName) {
    await runAllMigrations();
    return;
  }

  const migrationPath = join(process.cwd(), 'migrations', `${migrationName}.sql`);

  try {
    console.log(`Ejecutando migración: ${migrationName}`);
    const sql = readFileSync(migrationPath, 'utf8');

    // Ejecutar la migración
    await query(sql);

    console.log(`✅ Migración ${migrationName} ejecutada correctamente`);
  } catch (error: any) {
    console.error(`❌ Error ejecutando migración: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function runAllMigrations() {
  try {
    console.log('🔄 Ejecutando todas las migraciones...\n');

    // Leer todas las migraciones disponibles
    const migrationsDir = join(process.cwd(), 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ordenar alfabéticamente

    console.log('Migraciones encontradas:');
    migrationFiles.forEach(file => console.log(`  - ${file}`));
    console.log('');

    // Ejecutar cada migración
    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');
      const migrationPath = join(migrationsDir, file);

      try {
        console.log(`📄 Ejecutando: ${migrationName}`);
        const sql = readFileSync(migrationPath, 'utf8');
        await query(sql);
        console.log(`✅ ${migrationName} completada\n`);
      } catch (error: any) {
        // Si es error de tabla/columna/constraint ya existe, continuar
        const errorMsg = error.message.toLowerCase();
        const isAlreadyApplied =
          errorMsg.includes('already exists') ||
          errorMsg.includes('ya existe') ||
          errorMsg.includes('duplicate key') ||
          errorMsg.includes('column') && errorMsg.includes('already exists') ||
          errorMsg.includes('relation') && errorMsg.includes('already exists') ||
          errorMsg.includes('constraint') && errorMsg.includes('already exists');

        if (isAlreadyApplied) {
          console.log(`⏭️  ${migrationName} ya aplicada, continuando...\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 Todas las migraciones ejecutadas correctamente!');
  } catch (error: any) {
    console.error(`❌ Error ejecutando migraciones: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();