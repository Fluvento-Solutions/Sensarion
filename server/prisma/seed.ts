import 'dotenv/config';

import { PrismaClient, TeamRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PRACTICE_CODE = 'SENS-CARE';

async function main() {
  const password = process.env.DEV_LOGIN_PASSWORD ?? 'Pa$$w0rd';
  const passwordHash = await bcrypt.hash(password, 10);

  const practice = await prisma.practice.upsert({
    where: { code: PRACTICE_CODE },
    update: {},
    create: {
      name: 'Sensarion Musterpraxis',
      code: PRACTICE_CODE
    }
  });

  const user = await prisma.user.upsert({
    where: { email: 'max.mustermann@sensarion.local' },
    update: {
      passwordHash,
      practiceId: practice.id,
      displayName: 'Max Mustermann',
      shortName: 'Max M.',
      isPracticeAdmin: true
    },
    create: {
      email: 'max.mustermann@sensarion.local',
      passwordHash,
      displayName: 'Max Mustermann',
      shortName: 'Max M.',
      practiceId: practice.id,
      isPracticeAdmin: true
    }
  });

  const primaryTeam = await prisma.practiceTeam.upsert({
    where: {
      practiceId_name: {
        practiceId: practice.id,
        name: 'Zentrales Team'
      }
    },
    update: {},
    create: {
      practiceId: practice.id,
      name: 'Zentrales Team',
      description: 'Standardteam für alle Rollen der Praxis'
    }
  });

  await prisma.teamMembership.upsert({
    where: {
      userId_teamId: {
        userId: user.id,
        teamId: primaryTeam.id
      }
    },
    update: {
      role: TeamRole.PRACTICE_ADMIN
    },
    create: {
      userId: user.id,
      teamId: primaryTeam.id,
      role: TeamRole.PRACTICE_ADMIN
    }
  });

  console.log('✅ Seed completed with practice and Max Mustermann user');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

