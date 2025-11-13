import { Router, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/client';
import { env } from '../config/env';

const router = Router();

type AuthenticatedRequest = Request & { authUserId: string; authUser: Awaited<ReturnType<typeof prisma.user.findUnique>> };

// Helper: Extract user from token
const getAuthUser = async (req: Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  try {
    const payload = jwt.verify(token, env.SESSION_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { practice: true }
    });
    return user;
  } catch {
    return null;
  }
};

// Middleware: Require authentication
const requireAuth = async (req: Request, res: Response, next: () => void) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentifizierung erforderlich',
      code: 'AUTH_REQUIRED'
    });
  }
  (req as AuthenticatedRequest).authUserId = user.id;
  (req as AuthenticatedRequest).authUser = user;
  next();
};

// Middleware: Require admin access (isPracticeAdmin OR admin password)
const requireAdminAuth = async (req: Request, res: Response, next: () => void) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentifizierung erforderlich',
      code: 'AUTH_REQUIRED'
    });
  }

  // Check if user is practice admin
  if (user.isPracticeAdmin) {
    (req as AuthenticatedRequest).authUserId = user.id;
    (req as AuthenticatedRequest).authUser = user;
    return next();
  }

  // Check admin password if provided in body
  const body = req.body as { adminPassword?: string };
  if (body?.adminPassword) {
    const settings = await prisma.practiceSettings.findUnique({
      where: { practiceId: user.practiceId }
    });

    if (settings?.adminPasswordHash) {
      const passwordValid = await bcrypt.compare(body.adminPassword, settings.adminPasswordHash);
      if (passwordValid) {
        (req as AuthenticatedRequest).authUserId = user.id;
        (req as AuthenticatedRequest).authUser = user;
        return next();
      }
    }
  }

  return res.status(403).json({
    status: 'error',
    message: 'Admin-Zugriff erforderlich',
    code: 'ADMIN_REQUIRED'
  });
};

// Verify admin password
const verifyPasswordSchema = z.object({
  password: z.string().min(1)
});

router.post('/verify-password', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Nicht authentifiziert'
      });
    }

    const parsed = verifyPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const settings = await prisma.practiceSettings.findUnique({
      where: { practiceId: user.practiceId }
    });

    if (!settings?.adminPasswordHash) {
      return res.json({
        status: 'ok',
        valid: false,
        message: 'Kein Admin-Passwort gesetzt'
      });
    }

    const valid = await bcrypt.compare(parsed.data.password, settings.adminPasswordHash);
    return res.json({
      status: 'ok',
      valid
    });
  } catch (error) {
    console.error('verify password failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Verifizieren des Passworts'
    });
  }
});

// User Management
router.get('/users', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const users = await prisma.user.findMany({
      where: { practiceId: user.practiceId },
      select: {
        id: true,
        email: true,
        displayName: true,
        shortName: true,
        isPracticeAdmin: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { displayName: 'asc' }
    });

    return res.json({
      status: 'ok',
      users
    });
  } catch (error) {
    console.error('get users failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Benutzer'
    });
  }
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
  shortName: z.string().min(1),
  isPracticeAdmin: z.boolean().optional().default(false)
});

router.post('/users', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        displayName: parsed.data.displayName,
        shortName: parsed.data.shortName,
        practiceId: user.practiceId,
        isPracticeAdmin: parsed.data.isPracticeAdmin ?? false
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        shortName: true,
        isPracticeAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.json({
      status: 'ok',
      user: newUser
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'E-Mail-Adresse bereits vergeben'
      });
    }
    console.error('create user failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Erstellen des Benutzers'
    });
  }
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  displayName: z.string().min(1).optional(),
  shortName: z.string().min(1).optional(),
  isPracticeAdmin: z.boolean().optional()
});

router.put('/users/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!existingUser || existingUser.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Benutzer nicht gefunden'
      });
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (parsed.data.email) updateData.email = parsed.data.email;
    if (parsed.data.displayName) updateData.displayName = parsed.data.displayName;
    if (parsed.data.shortName) updateData.shortName = parsed.data.shortName;
    if (parsed.data.isPracticeAdmin !== undefined) updateData.isPracticeAdmin = parsed.data.isPracticeAdmin;
    if (parsed.data.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        shortName: true,
        isPracticeAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.json({
      status: 'ok',
      user: updatedUser
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'E-Mail-Adresse bereits vergeben'
      });
    }
    console.error('update user failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Aktualisieren des Benutzers'
    });
  }
});

router.delete('/users/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true, id: true }
    });

    if (!existingUser || existingUser.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Benutzer nicht gefunden'
      });
    }

    if (existingUser.id === user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Sie können sich nicht selbst löschen'
      });
    }

    await prisma.user.delete({
      where: { id: req.params.id }
    });

    return res.json({
      status: 'ok'
    });
  } catch (error) {
    console.error('delete user failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Löschen des Benutzers'
    });
  }
});

// User Types Management
router.get('/user-types', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const userTypes = await prisma.userType.findMany({
      where: { practiceId: user.practiceId },
      orderBy: { name: 'asc' }
    });

    return res.json({
      status: 'ok',
      userTypes
    });
  } catch (error) {
    console.error('get user types failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Usertypen'
    });
  }
});

const createUserTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  defaultPermissions: z.array(z.string()).optional()
});

router.post('/user-types', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = createUserTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const userType = await prisma.userType.create({
      data: {
        practiceId: user.practiceId,
        name: parsed.data.name,
        description: parsed.data.description,
        defaultPermissions: parsed.data.defaultPermissions ? parsed.data.defaultPermissions : null
      }
    });

    return res.json({
      status: 'ok',
      userType
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Usertyp mit diesem Namen existiert bereits'
      });
    }
    console.error('create user type failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Erstellen des Usertyps'
    });
  }
});

const updateUserTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  defaultPermissions: z.array(z.string()).optional()
});

router.put('/user-types/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateUserTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const existing = await prisma.userType.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!existing || existing.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Usertyp nicht gefunden'
      });
    }

    const updateData: Prisma.UserTypeUpdateInput = {};
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.defaultPermissions !== undefined) {
      updateData.defaultPermissions = parsed.data.defaultPermissions.length > 0 ? parsed.data.defaultPermissions : null;
    }

    const userType = await prisma.userType.update({
      where: { id: req.params.id },
      data: updateData
    });

    return res.json({
      status: 'ok',
      userType
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Usertyp mit diesem Namen existiert bereits'
      });
    }
    console.error('update user type failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Aktualisieren des Usertyps'
    });
  }
});

router.delete('/user-types/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const existing = await prisma.userType.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!existing || existing.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Usertyp nicht gefunden'
      });
    }

    await prisma.userType.delete({
      where: { id: req.params.id }
    });

    return res.json({
      status: 'ok'
    });
  } catch (error) {
    console.error('delete user type failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Löschen des Usertyps'
    });
  }
});

// Team Management
router.get('/teams', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const teams = await prisma.practiceTeam.findMany({
      where: { practiceId: user.practiceId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                shortName: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json({
      status: 'ok',
      teams: teams.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        members: team.members.map(m => ({
          id: m.id,
          userId: m.userId,
          teamId: m.teamId,
          role: m.role,
          user: m.user
        }))
      }))
    });
  } catch (error) {
    console.error('get teams failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Teams'
    });
  }
});

const createTeamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

router.post('/teams', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = createTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const team = await prisma.practiceTeam.create({
      data: {
        practiceId: user.practiceId,
        name: parsed.data.name,
        description: parsed.data.description
      }
    });

    return res.json({
      status: 'ok',
      team
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Team mit diesem Namen existiert bereits'
      });
    }
    console.error('create team failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Erstellen des Teams'
    });
  }
});

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional()
});

router.put('/teams/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const existing = await prisma.practiceTeam.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!existing || existing.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Team nicht gefunden'
      });
    }

    const updateData: Prisma.PracticeTeamUpdateInput = {};
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

    const team = await prisma.practiceTeam.update({
      where: { id: req.params.id },
      data: updateData
    });

    return res.json({
      status: 'ok',
      team
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Team mit diesem Namen existiert bereits'
      });
    }
    console.error('update team failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Aktualisieren des Teams'
    });
  }
});

router.delete('/teams/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const existing = await prisma.practiceTeam.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!existing || existing.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Team nicht gefunden'
      });
    }

    await prisma.practiceTeam.delete({
      where: { id: req.params.id }
    });

    return res.json({
      status: 'ok'
    });
  } catch (error) {
    console.error('delete team failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Löschen des Teams'
    });
  }
});

const addTeamMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['PRACTICE_ADMIN', 'PHYSICIAN', 'MFA', 'ADMINISTRATION', 'CUSTOM'])
});

router.post('/teams/:id/members', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = addTeamMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const team = await prisma.practiceTeam.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!team || team.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Team nicht gefunden'
      });
    }

    const memberUser = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { practiceId: true }
    });

    if (!memberUser || memberUser.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Benutzer nicht gefunden'
      });
    }

    const membership = await prisma.teamMembership.create({
      data: {
        userId: parsed.data.userId,
        teamId: req.params.id,
        role: parsed.data.role
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            shortName: true
          }
        }
      }
    });

    return res.json({
      status: 'ok',
      membership: {
        id: membership.id,
        userId: membership.userId,
        teamId: membership.teamId,
        role: membership.role,
        user: membership.user
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Benutzer ist bereits Mitglied des Teams'
      });
    }
    console.error('add team member failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Hinzufügen des Team-Mitglieds'
    });
  }
});

router.delete('/teams/:id/members/:userId', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const team = await prisma.practiceTeam.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!team || team.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Team nicht gefunden'
      });
    }

    await prisma.teamMembership.deleteMany({
      where: {
        teamId: req.params.id,
        userId: req.params.userId
      }
    });

    return res.json({
      status: 'ok'
    });
  } catch (error) {
    console.error('remove team member failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Entfernen des Team-Mitglieds'
    });
  }
});

// Room Management
router.get('/rooms', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const rooms = await prisma.room.findMany({
      where: { practiceId: user.practiceId },
      include: {
        roomType: true
      },
      orderBy: { name: 'asc' }
    });

    return res.json({
      status: 'ok',
      rooms
    });
  } catch (error) {
    console.error('get rooms failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Räume'
    });
  }
});

const createRoomSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  roomTypeId: z.string().optional()
});

router.post('/rooms', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const room = await prisma.room.create({
      data: {
        practiceId: user.practiceId,
        name: parsed.data.name,
        description: parsed.data.description,
        roomTypeId: parsed.data.roomTypeId || null
      },
      include: {
        roomType: true
      }
    });

    return res.json({
      status: 'ok',
      room
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Raum mit diesem Namen existiert bereits'
      });
    }
    console.error('create room failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Erstellen des Raums'
    });
  }
});

const updateRoomSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  roomTypeId: z.string().optional().nullable()
});

router.put('/rooms/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const existing = await prisma.room.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!existing || existing.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Raum nicht gefunden'
      });
    }

    const updateData: Prisma.RoomUpdateInput = {};
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.roomTypeId !== undefined) {
      updateData.roomType = parsed.data.roomTypeId ? { connect: { id: parsed.data.roomTypeId } } : { disconnect: true };
    }

    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        roomType: true
      }
    });

    return res.json({
      status: 'ok',
      room
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Raum mit diesem Namen existiert bereits'
      });
    }
    console.error('update room failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Aktualisieren des Raums'
    });
  }
});

router.delete('/rooms/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const existing = await prisma.room.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!existing || existing.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Raum nicht gefunden'
      });
    }

    await prisma.room.delete({
      where: { id: req.params.id }
    });

    return res.json({
      status: 'ok'
    });
  } catch (error) {
    console.error('delete room failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Löschen des Raums'
    });
  }
});

// Room Types Management
router.get('/room-types', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const roomTypes = await prisma.roomType.findMany({
      where: { practiceId: user.practiceId },
      orderBy: { name: 'asc' }
    });

    return res.json({
      status: 'ok',
      roomTypes
    });
  } catch (error) {
    console.error('get room types failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Raumtypen'
    });
  }
});

const createRoomTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional()
});

router.post('/room-types', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = createRoomTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const roomType = await prisma.roomType.create({
      data: {
        practiceId: user.practiceId,
        name: parsed.data.name,
        description: parsed.data.description,
        color: parsed.data.color,
        icon: parsed.data.icon
      }
    });

    return res.json({
      status: 'ok',
      roomType
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Raumtyp mit diesem Namen existiert bereits'
      });
    }
    console.error('create room type failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Erstellen des Raumtyps'
    });
  }
});

const updateRoomTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional()
});

router.put('/room-types/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateRoomTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const existing = await prisma.roomType.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!existing || existing.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Raumtyp nicht gefunden'
      });
    }

    const updateData: Prisma.RoomTypeUpdateInput = {};
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.color !== undefined) updateData.color = parsed.data.color;
    if (parsed.data.icon !== undefined) updateData.icon = parsed.data.icon;

    const roomType = await prisma.roomType.update({
      where: { id: req.params.id },
      data: updateData
    });

    return res.json({
      status: 'ok',
      roomType
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Raumtyp mit diesem Namen existiert bereits'
      });
    }
    console.error('update room type failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Aktualisieren des Raumtyps'
    });
  }
});

router.delete('/room-types/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const existing = await prisma.roomType.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!existing || existing.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Raumtyp nicht gefunden'
      });
    }

    await prisma.roomType.delete({
      where: { id: req.params.id }
    });

    return res.json({
      status: 'ok'
    });
  } catch (error) {
    console.error('delete room type failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Löschen des Raumtyps'
    });
  }
});

// Permissions
router.get('/permissions', requireAdminAuth, async (req, res) => {
  try {
    // Return available permission codes
    const permissions = [
      'patients.read',
      'patients.write',
      'patients.delete',
      'calendar.read',
      'calendar.write',
      'calendar.delete',
      'admin.users.read',
      'admin.users.write',
      'admin.users.delete',
      'admin.teams.read',
      'admin.teams.write',
      'admin.teams.delete',
      'admin.rooms.read',
      'admin.rooms.write',
      'admin.rooms.delete',
      'admin.settings.read',
      'admin.settings.write'
    ];

    return res.json({
      status: 'ok',
      permissions
    });
  } catch (error) {
    console.error('get permissions failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Berechtigungen'
    });
  }
});

router.get('/users/:id/permissions', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!targetUser || targetUser.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Benutzer nicht gefunden'
      });
    }

    const memberships = await prisma.teamMembership.findMany({
      where: { userId: req.params.id },
      include: {
        permissions: true
      }
    });

    const permissions = new Set<string>();
    memberships.forEach(membership => {
      membership.permissions.forEach(perm => {
        permissions.add(perm.permissionCode);
      });
    });

    return res.json({
      status: 'ok',
      permissions: Array.from(permissions)
    });
  } catch (error) {
    console.error('get user permissions failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Berechtigungen'
    });
  }
});

const updatePermissionsSchema = z.object({
  membershipId: z.string(),
  permissions: z.array(z.string())
});

router.put('/users/:id/permissions', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updatePermissionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { practiceId: true }
    });

    if (!targetUser || targetUser.practiceId !== user.practiceId) {
      return res.status(404).json({
        status: 'error',
        message: 'Benutzer nicht gefunden'
      });
    }

    const membership = await prisma.teamMembership.findUnique({
      where: { id: parsed.data.membershipId },
      select: { userId: true }
    });

    if (!membership || membership.userId !== req.params.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Team-Mitgliedschaft nicht gefunden'
      });
    }

    // Delete existing permissions
    await prisma.teamRolePermission.deleteMany({
      where: { membershipId: parsed.data.membershipId }
    });

    // Create new permissions
    if (parsed.data.permissions.length > 0) {
      await prisma.teamRolePermission.createMany({
        data: parsed.data.permissions.map(perm => ({
          membershipId: parsed.data.membershipId,
          permissionCode: perm
        }))
      });
    }

    return res.json({
      status: 'ok'
    });
  } catch (error) {
    console.error('update permissions failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Aktualisieren der Berechtigungen'
    });
  }
});

// Practice Settings
router.get('/settings', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    let settings = await prisma.practiceSettings.findUnique({
      where: { practiceId: user.practiceId }
    });

    if (!settings) {
      settings = await prisma.practiceSettings.create({
        data: {
          practiceId: user.practiceId,
          settings: {}
        }
      });
    }

    return res.json({
      status: 'ok',
      settings: {
        id: settings.id,
        settings: settings.settings,
        hasAdminPassword: !!settings.adminPasswordHash
      }
    });
  } catch (error) {
    console.error('get settings failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Einstellungen'
    });
  }
});

const updateSettingsSchema = z.object({
  settings: z.record(z.any())
});

router.put('/settings', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    let settings = await prisma.practiceSettings.findUnique({
      where: { practiceId: user.practiceId }
    });

    if (!settings) {
      settings = await prisma.practiceSettings.create({
        data: {
          practiceId: user.practiceId,
          settings: parsed.data.settings
        }
      });
    } else {
      settings = await prisma.practiceSettings.update({
        where: { practiceId: user.practiceId },
        data: {
          settings: parsed.data.settings
        }
      });
    }

    return res.json({
      status: 'ok',
      settings: {
        id: settings.id,
        settings: settings.settings,
        hasAdminPassword: !!settings.adminPasswordHash
      }
    });
  } catch (error) {
    console.error('update settings failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Aktualisieren der Einstellungen'
    });
  }
});

const setAdminPasswordSchema = z.object({
  password: z.string().min(8)
});

router.post('/admin-password', requireAdminAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = setAdminPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Eingabe',
        errors: parsed.error.errors
      });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    let settings = await prisma.practiceSettings.findUnique({
      where: { practiceId: user.practiceId }
    });

    if (!settings) {
      settings = await prisma.practiceSettings.create({
        data: {
          practiceId: user.practiceId,
          adminPasswordHash: passwordHash,
          settings: {}
        }
      });
    } else {
      settings = await prisma.practiceSettings.update({
        where: { practiceId: user.practiceId },
        data: {
          adminPasswordHash: passwordHash
        }
      });
    }

    return res.json({
      status: 'ok'
    });
  } catch (error) {
    console.error('set admin password failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Setzen des Admin-Passworts'
    });
  }
});

export default router;

