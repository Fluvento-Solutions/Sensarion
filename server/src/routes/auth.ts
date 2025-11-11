import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { env } from '../config/env';
import { prisma } from '../db/client';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().optional()
});

router.post('/dev-login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      errors: parsed.error.flatten().fieldErrors
    });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      practice: true,
      memberships: {
        include: {
          team: true
        }
      }
    }
  });

  if (!user) {
    return res.status(404).json({ status: 'error', message: 'User not found' });
  }

  const candidatePassword = password ?? env.DEV_LOGIN_PASSWORD;
  const passwordValid = await bcrypt.compare(candidatePassword, user.passwordHash);

  if (!passwordValid) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
  }

  const responseUser = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    shortName: user.shortName,
    practice: {
      id: user.practice.id,
      name: user.practice.name,
      code: user.practice.code
    },
    teams: user.memberships.map((membership) => ({
      id: membership.team.id,
      name: membership.team.name,
      role: membership.role
    })),
    isPracticeAdmin: user.isPracticeAdmin
  };

  res.json({ status: 'ok', user: responseUser, token: null });
});

router.get('/profile/:id', async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      practice: true,
      memberships: {
        include: {
          team: true
        }
      }
    }
  });

  if (!user) {
    return res.status(404).json({ status: 'error', message: 'User not found' });
  }

  res.json({
    status: 'ok',
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      shortName: user.shortName,
      practice: {
        id: user.practice.id,
        name: user.practice.name,
        code: user.practice.code
      },
      teams: user.memberships.map((membership) => ({
        id: membership.team.id,
        name: membership.team.name,
        role: membership.role
      })),
      isPracticeAdmin: user.isPracticeAdmin
    }
  });
});

export default router;

