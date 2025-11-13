/**
 * Aktiviert RLS Policies
 * 
 * Führt die RLS Policies SQL-Datei aus
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🔒 Activating RLS Policies...');
  
  const sqlFile = join(__dirname, '../src/infrastructure/db/rls/policies.sql');
  const sql = readFileSync(sqlFile, 'utf-8');
  
  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (error: any) {
      // Ignore "already exists" errors
      if (error?.message?.includes('already exists')) {
        console.log('⚠️  Policy already exists, skipping...');
      } else {
        console.error('❌ Error executing statement:', statement.substring(0, 50));
        console.error(error.message);
      }
    }
  }
  
  console.log('✅ RLS Policies activated!');
}

main()
  .catch((e) => {
    console.error('❌ Failed to activate RLS:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

