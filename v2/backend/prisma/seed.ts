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
  
  // 1. Create or get Tenant
  let tenant = await prisma.tenant.findUnique({
    where: { code: 'praxis-mustermann' }
  });
  
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Praxis Mustermann',
        code: 'praxis-mustermann'
      }
    });
    console.log('✅ Created tenant:', tenant.code);
  } else {
    console.log('✅ Tenant already exists:', tenant.code);
  }
  
  // 2. Create or get Modules
  const moduleData = [
    { code: 'patients', name: 'Patientenverwaltung', description: 'Verwaltung von Patienten, Vitalwerten, Diagnosen' },
    { code: 'calendar', name: 'Terminverwaltung', description: 'Verwaltung von Terminen und Räumen' },
    { code: 'exports', name: 'Datenexport', description: 'Export von Daten (JSON/FHIR)' },
    { code: 'ai-assistant', name: 'KI-Assistent', description: 'KI-Unterstützung für Textverbesserung und Analyse' }
  ];
  
  const modules = await Promise.all(
    moduleData.map(async (data) => {
      const existing = await prisma.module.findUnique({
        where: { code: data.code }
      });
      if (existing) {
        return existing;
      }
      return prisma.module.create({ data });
    })
  );
  
  console.log('✅ Modules ready:', modules.map(m => m.code).join(', '));
  
  // 3. Create or get User (Admin)
  let user = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      email: 'admin@praxis-mustermann.local'
    }
  });
  
  if (!user) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    user = await prisma.user.create({
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
  } else {
    console.log('✅ User already exists:', user.email);
  }
  
  // 4. Activate Modules for Tenant
  await Promise.all(
    modules.map(async (module) => {
      const existing = await prisma.tenantModule.findUnique({
        where: {
          tenantId_moduleId: {
            tenantId: tenant.id,
            moduleId: module.id
          }
        }
      });
      if (!existing) {
        await prisma.tenantModule.create({
          data: {
            tenantId: tenant.id,
            moduleId: module.id,
            plan: 'premium',
            status: 'active',
            validFrom: new Date(),
            validTo: null
          }
        });
      }
    })
  );
  
  console.log('✅ Modules activated for tenant');
  
  // 5. Create or get Default Calendar
  let defaultCalendar = await prisma.calendar.findFirst({
    where: {
      tenantId: tenant.id,
      name: 'Hauptkalender'
    }
  });
  
  if (!defaultCalendar) {
    defaultCalendar = await prisma.calendar.create({
      data: {
        tenantId: tenant.id,
        name: 'Hauptkalender',
        type: 'general',
        color: '#3b82f6',
        ownerId: user.id // Prisma User model has 'id', not 'userId'
      }
    });
    console.log('✅ Created default calendar:', defaultCalendar.name);
  } else {
    console.log('✅ Default calendar already exists:', defaultCalendar.name);
  }
  
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

