import { pool } from '../config/database';
import { readFileSync } from 'fs';
import { join } from 'path';

const applyMigration = async (migrationFile: string) => {
  try {
    console.log(`Applying migration: ${migrationFile}`);

    const migrationPath = join(__dirname, '../../migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf8');

    await pool.query(sql);

    console.log(`✅ Migration ${migrationFile} applied successfully!`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error applying migration:`, error);
    process.exit(1);
  }
};

const migrationFile = process.argv[2] || '005_add_messaging_system.sql';
applyMigration(migrationFile);
