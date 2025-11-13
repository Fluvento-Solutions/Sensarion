import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { ProblemDetailsFactory } from '../errors/ProblemDetails';
import { prisma } from '@/infrastructure/db/client';
import { PasswordService } from '@/infrastructure/auth/PasswordService';

/**
 * Admin Routes
 * 
 * GET /admin/verify-password
 * GET /admin/users
 * POST /admin/users
 * PUT /admin/users/:id
 * DELETE /admin/users/:id
 * GET /admin/user-types
 * POST /admin/user-types
 * PUT /admin/user-types/:id
 * DELETE /admin/user-types/:id
 * GET /admin/teams
 * POST /admin/teams
 * PUT /admin/teams/:id
 * DELETE /admin/teams/:id
 * GET /admin/rooms
 * POST /admin/rooms
 * PUT /admin/rooms/:id
 * DELETE /admin/rooms/:id
 * GET /admin/room-types
 * POST /admin/room-types
 * PUT /admin/room-types/:id
 * DELETE /admin/room-types/:id
 * GET /admin/permissions
 * GET /admin/settings
 * PATCH /admin/settings
 */
export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  const passwordService = new PasswordService();

  // ============================================================================
  // Admin Password Verification
  // ============================================================================
  
  fastify.post('/admin/verify-password', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['password'],
        properties: {
          password: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    
    // TODO: Get practice settings from tenant
    // For now: Check if user is admin
    const isAdmin = user.roles.includes('admin');
    
    return reply.status(200).send({
      valid: isAdmin
    });
  });

  // ============================================================================
  // User Management
  // ============================================================================
  
  fastify.get('/admin/users', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    
    const users = await prisma.user.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        email: true,
        displayName: true,
        shortName: true,
        roles: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { displayName: 'asc' }
    });
    
    return reply.status(200).send({ users });
  });
  
  fastify.post('/admin/users', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'displayName', 'shortName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          displayName: { type: 'string', minLength: 1 },
          shortName: { type: 'string', minLength: 1 },
          roles: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const dto = request.body as any;
    
    // Check if email already exists
    const existing = await prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase().trim(),
        tenantId: user.tenantId
      }
    });
    
    if (existing) {
      throw ProblemDetailsFactory.conflict('User with this email already exists', request.url);
    }
    
    const hashedPassword = await passwordService.hash(dto.password);
    
    const newUser = await prisma.user.create({
      data: {
        tenantId: user.tenantId,
        email: dto.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        displayName: dto.displayName,
        shortName: dto.shortName,
        roles: dto.roles || ['user']
      }
    });
    
    return reply.status(201).send({
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        shortName: newUser.shortName,
        roles: newUser.roles,
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString()
      }
    });
  });
  
  fastify.put('/admin/users/:id', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          displayName: { type: 'string', minLength: 1 },
          shortName: { type: 'string', minLength: 1 },
          roles: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const dto = request.body as any;
    
    const existing = await prisma.user.findFirst({
      where: { id, tenantId: user.tenantId }
    });
    
    if (!existing) {
      throw ProblemDetailsFactory.notFound('User', id, request.url);
    }
    
    const updateData: any = {};
    if (dto.email) updateData.email = dto.email.toLowerCase().trim();
    if (dto.password) updateData.passwordHash = await passwordService.hash(dto.password);
    if (dto.displayName) updateData.displayName = dto.displayName;
    if (dto.shortName) updateData.shortName = dto.shortName;
    if (dto.roles) updateData.roles = dto.roles;
    
    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });
    
    return reply.status(200).send({
      user: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        shortName: updated.shortName,
        roles: updated.roles,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString()
      }
    });
  });
  
  fastify.delete('/admin/users/:id', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const existing = await prisma.user.findFirst({
      where: { id, tenantId: user.tenantId }
    });
    
    if (!existing) {
      throw ProblemDetailsFactory.notFound('User', id, request.url);
    }
    
    await prisma.user.delete({ where: { id } });
    
    return reply.status(204).send();
  });

  // ============================================================================
  // User Types (TODO: Implement when schema is ready)
  // ============================================================================
  
  fastify.get('/admin/user-types', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    // TODO: Implement when UserType model exists
    return reply.status(200).send({ userTypes: [] });
  });

  // ============================================================================
  // Teams (TODO: Implement when schema is ready)
  // ============================================================================
  
  fastify.get('/admin/teams', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    // TODO: Implement when Team model exists
    return reply.status(200).send({ teams: [] });
  });

  // ============================================================================
  // Rooms (TODO: Implement when schema is ready)
  // ============================================================================
  
  fastify.get('/admin/rooms', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    // TODO: Implement when Room model exists
    return reply.status(200).send({ rooms: [] });
  });

  // ============================================================================
  // Room Types (TODO: Implement when schema is ready)
  // ============================================================================
  
  fastify.get('/admin/room-types', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    // TODO: Implement when RoomType model exists
    return reply.status(200).send({ roomTypes: [] });
  });

  // ============================================================================
  // Permissions
  // ============================================================================
  
  fastify.get('/admin/permissions', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
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
    
    return reply.status(200).send({ permissions });
  });

  // ============================================================================
  // Practice Settings
  // ============================================================================
  
  fastify.get('/admin/settings', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        settings: true
      }
    });
    
    if (!tenant) {
      throw ProblemDetailsFactory.notFound('Tenant', user.tenantId, request.url);
    }
    
    return reply.status(200).send({
      settings: tenant.settings || {},
      hasAdminPassword: false // TODO: Check if admin password is set
    });
  });
  
  fastify.patch('/admin/settings', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        properties: {
          settings: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { settings } = request.body as { settings: any };
    
    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { settings }
    });
    
    return reply.status(200).send({ settings });
  });
}

