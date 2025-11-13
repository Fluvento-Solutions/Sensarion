/**
 * Database Seed
 * 
 * Erstellt initiale Daten für Development
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // 1. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Praxis Mustermann',
      code: 'praxis-mustermann'
    }
  });
  
  console.log('✅ Created tenant:', tenant.code);
  
  // 2. Create Modules
  const modules = await Promise.all([
    prisma.module.create({
      data: {
        code: 'patients',
        name: 'Patientenverwaltung',
        description: 'Verwaltung von Patienten, Vitalwerten, Diagnosen'
      }
    }),
    prisma.module.create({
      data: {
        code: 'calendar',
        name: 'Terminverwaltung',
        description: 'Verwaltung von Terminen und Räumen'
      }
    }),
    prisma.module.create({
      data: {
        code: 'exports',
        name: 'Datenexport',
        description: 'Export von Daten (JSON/FHIR)'
      }
    }),
    prisma.module.create({
      data: {
        code: 'ai-assistant',
        name: 'KI-Assistent',
        description: 'KI-Unterstützung für Textverbesserung und Analyse'
      }
    })
  ]);
  
  console.log('✅ Created modules:', modules.map(m => m.code).join(', '));
  
  // 3. Create User (Admin)
  const passwordHash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@praxis-mustermann.local',
      passwordHash,
      displayName: 'Admin',
      shortName: 'Admin',
      roles: ['admin', 'physician']
    }
  });
  
  console.log('✅ Created user:', user.email);
  
  // 4. Activate Modules for Tenant
  await Promise.all(
    modules.map(module =>
      prisma.tenantModule.create({
        data: {
          tenantId: tenant.id,
          moduleId: module.id,
          plan: 'premium',
          status: 'active',
          validFrom: new Date(),
          validTo: null
        }
      })
    )
  );
  
  console.log('✅ Activated all modules for tenant');
  
  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

