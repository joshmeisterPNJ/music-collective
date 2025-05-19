// server/tests/jest.setup.mjs
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// —— ESM __dirname shim ——
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// —— Load test env explicitly ——
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

export default async function globalSetup() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL missing in .env.test');
    process.exit(1);
  }

  const migrationsDir = path.resolve(__dirname, '../../migrations');
  let files;
  try {
    files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
  } catch (err) {
    console.error(`❌ Cannot read migrations folder at ${migrationsDir}:`, err.message);
    process.exit(1);
  }

  console.log('🧪 Applying migrations in order:', files.join(', '));

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration not found: ${filePath}`);
      process.exit(1);
    }

    console.log(`📄 Running ${file}`);
    try {
      execSync(`psql "${dbUrl}" -f "${filePath}"`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`❌ Failed on ${file}:`, err.message);
      throw err;
    }
  }

  console.log('✅ All migrations applied successfully.');
}
