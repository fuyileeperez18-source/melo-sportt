import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { query, pool } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config({ path: join(process.cwd(), '.env') });

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function executeQueryWithRetry(sql: string, description: string) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`⏳ Reintentando ${description}... (Intento ${attempt}/${MAX_RETRIES})`);
      }
      return await query(sql);
    } catch (error: any) {
      lastError = error;
      const isConstraintError =
        error.message.includes('already exists') ||
        error.message.includes('ya existe') ||
        error.message.includes('duplicate key');

      // Si es error de constraint, no reintentamos (ya se manejaba antes, pero aquí lo detectamos para no esperar)
      if (isConstraintError) throw error;

      console.error(`⚠️ Error en ${description} (Intento ${attempt}/${MAX_RETRIES}): ${error.message}`);

      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY);
      }
    }
  }
  throw lastError;
}

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

    // Ejecutar la migración con reintentos
    await executeQueryWithRetry(sql, `migración ${migrationName}`);

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
    console.log('🔄 Ejecutando todas las migraciones con soporte de reintentos...\n');

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

        await executeQueryWithRetry(sql, migrationName);

        console.log(`✅ ${migrationName} completada\n`);
      } catch (error: any) {
        // Si es error de tabla/columna/constraint ya existe, continuar
        const errorMsg = error.message.toLowerCase();
        const isAlreadyApplied =
          errorMsg.includes('already exists') ||
          errorMsg.includes('ya existe') ||
          errorMsg.includes('duplicate key') ||
          (errorMsg.includes('column') && errorMsg.includes('already exists')) ||
          (errorMsg.includes('relation') && errorMsg.includes('already exists')) ||
          (errorMsg.includes('constraint') && errorMsg.includes('already exists'));

        if (isAlreadyApplied) {
          console.log(`⏭️  ${migrationName} ya aplicada, continuando...\n`);
        } else {
          // Si falló después de reintentos y no es "already exists"
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