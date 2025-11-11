import { Router, type Request, type RequestHandler, type Response } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { env } from '../config/env';
import { prisma } from '../db/client';

const router = Router();
const TOKEN_EXPIRY = '12h';

type TeamSummary = {
  id: string;
  name: string;
  role: string;
};

type PracticeSummary = {
  id: string;
  name: string;
  code: string;
};

export type UserProfileResponse = {
  id: string;
  email: string;
  displayName: string;
  shortName: string;
  practice: PracticeSummary;
  teams: TeamSummary[];
  isPracticeAdmin: boolean;
};

export type AuthSuccessResponse = {
  status: 'ok';
  token: string;
  user: UserProfileResponse;
};

export type AuthErrorResponse = {
  status: 'error';
  message: string;
  code?: string;
};

export type ProfileSuccessResponse = {
  status: 'ok';
  user: UserProfileResponse;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string({ required_error: 'PASSWORD_REQUIRED' }).min(1)
});

const devLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().optional()
});

const defaultUserInclude = {
  practice: true,
  memberships: {
    include: {
      team: true
    }
  }
} as const;

const toUserProfile = (user: Awaited<ReturnType<typeof prisma.user.findUnique>>) => {
  if (!user || !user.practice) {
    throw new Error('User record is incomplete.');
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    shortName: user.shortName,
    practice: {
      id: user.practice.id,
      name: user.practice.name,
      code: user.practice.code
    },
    teams:
      user.memberships?.map((membership) => ({
        id: membership.team.id,
        name: membership.team.name,
        role: membership.role
      })) ?? [],
    isPracticeAdmin: user.isPracticeAdmin
  } satisfies UserProfileResponse;
};

type AuthenticatedRequest = Request & { authUserId: string };

const issueToken = (userId: string) =>
  jwt.sign({ userId }, env.SESSION_SECRET, { expiresIn: TOKEN_EXPIRY });

const respondWithAuth = (
  res: Response,
  user: Awaited<ReturnType<typeof prisma.user.findUnique>>
) => {
  if (!user) {
    throw new Error('User not provided for auth response');
  }

  const token = issueToken(user.id);
  return res.json<AuthSuccessResponse>({
    status: 'ok',
    token,
    user: toUserProfile(user)
  });
};

const requireAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json<AuthErrorResponse>({
      status: 'error',
      message: 'Authentifizierung erforderlich',
      code: 'AUTH_REQUIRED'
    });
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json<AuthErrorResponse>({
      status: 'error',
      message: 'Ungültiges Auth-Format',
      code: 'INVALID_AUTH_HEADER'
    });
  }

  try {
    const payload = jwt.verify(token, env.SESSION_SECRET) as { userId: string };
    (req as AuthenticatedRequest).authUserId = payload.userId;
    next();
  } catch (error) {
    console.error('Token verification failed', error);
    return res.status(401).json<AuthErrorResponse>({
      status: 'error',
      message: 'Session abgelaufen oder ungültig',
      code: 'TOKEN_INVALID'
    });
  }
};

const authenticateUser = async (email: string, password: string, fallbackPassword?: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: defaultUserInclude
  });

  if (!user) {
    return { error: 'USER_NOT_FOUND' } as const;
  }

  const candidatePassword = password ?? fallbackPassword;
  if (!candidatePassword) {
    return { error: 'INVALID_CREDENTIALS' } as const;
  }

  const passwordValid = await bcrypt.compare(candidatePassword, user.passwordHash);

  if (!passwordValid) {
    return { error: 'INVALID_CREDENTIALS' } as const;
  }

  return { user } as const;
};

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json<AuthErrorResponse>({
      status: 'error',
      message: 'Ungültige Login-Daten',
      code: 'INVALID_PAYLOAD'
    });
  }

  try {
    const result = await authenticateUser(parsed.data.email, parsed.data.password);

    if ('error' in result) {
      const status = result.error === 'USER_NOT_FOUND' ? 404 : 401;
      return res.status(status).json<AuthErrorResponse>({
        status: 'error',
        message:
          result.error === 'USER_NOT_FOUND'
            ? 'Nutzer wurde nicht gefunden.'
            : 'E-Mail oder Passwort ist falsch.',
        code: result.error
      });
    }

    return respondWithAuth(res, result.user);
  } catch (error) {
    console.error('login failed', error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientInitializationError
    ) {
      return res.status(503).json<AuthErrorResponse>({
        status: 'error',
        message:
          'Keine Verbindung zur Datenbank möglich. Bitte prüfe die PostgreSQL-Instanz und die DATABASE_URL.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    return res.status(500).json<AuthErrorResponse>({
      status: 'error',
      message: 'Interner Authentifizierungsfehler',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
});

router.post('/dev-login', async (req, res) => {
  const parsed = devLoginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json<AuthErrorResponse>({
      status: 'error',
      message: 'Invalid request payload',
      code: 'INVALID_PAYLOAD'
    });
  }

  try {
    const result = await authenticateUser(
      parsed.data.email,
      parsed.data.password ?? env.DEV_LOGIN_PASSWORD,
      env.DEV_LOGIN_PASSWORD
    );

    if ('error' in result) {
      const status = result.error === 'USER_NOT_FOUND' ? 404 : 401;
      return res.status(status).json<AuthErrorResponse>({
        status: 'error',
        message:
          result.error === 'USER_NOT_FOUND'
            ? 'Demo-Nutzer nicht gefunden. Bitte führe die Prisma-Seeds aus.'
            : 'Invalid credentials',
        code: result.error
      });
    }

    return respondWithAuth(res, result.user);
  } catch (error) {
    console.error('dev-login failed', error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientInitializationError
    ) {
      return res.status(503).json<AuthErrorResponse>({
        status: 'error',
        message:
          'Keine Verbindung zur Datenbank möglich. Bitte prüfe die PostgreSQL-Instanz und die DATABASE_URL.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    return res.status(500).json<AuthErrorResponse>({
      status: 'error',
      message: 'Internal authentication error',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
});

router.post('/logout', requireAuth, (_req, res) => {
  return res.json({ status: 'ok' });
});

router.get('/profile/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const authUserId = (req as AuthenticatedRequest).authUserId;

  if (authUserId !== id) {
    return res.status(403).json<AuthErrorResponse>({
      status: 'error',
      message: 'Keine Berechtigung, dieses Profil abzurufen.',
      code: 'FORBIDDEN'
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: defaultUserInclude
    });

    if (!user) {
      return res.status(404).json<AuthErrorResponse>({
        status: 'error',
        message: 'Nutzerprofil nicht gefunden. Bitte überprüfe die Benutzer-ID oder führe die Seeds erneut aus.',
        code: 'USER_NOT_FOUND'
      });
    }

    return res.json<ProfileSuccessResponse>({
      status: 'ok',
      user: toUserProfile(user)
    });
  } catch (error) {
    console.error('profile lookup failed', error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientInitializationError
    ) {
      return res.status(503).json<AuthErrorResponse>({
        status: 'error',
        message:
          'Keine Verbindung zur Datenbank möglich. Bitte prüfe die PostgreSQL-Instanz und die DATABASE_URL.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    return res.status(500).json<AuthErrorResponse>({
      status: 'error',
      message: 'Internal authentication error',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
});

export default router;

