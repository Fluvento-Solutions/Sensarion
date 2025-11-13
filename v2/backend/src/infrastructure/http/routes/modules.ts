import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { prisma } from '@/infrastructure/db/client';

/**
 * Module Routes
 * 
 * GET /modules - Modul-Katalog
 * GET /tenant-modules - Aktive Subscriptions
 * POST /tenant-modules - Modul abonnieren
 * DELETE /tenant-modules/:id - Subscription kündigen
 */
export async function moduleRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /modules
  fastify.get('/modules', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (_request, reply) => {
    const modules = await prisma.module.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    return reply.status(200).send({ modules });
  });
  
  // GET /tenant-modules
  fastify.get('/tenant-modules', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    
    const subscriptions = await prisma.tenantModule.findMany({
      where: { tenantId: user.tenantId },
      include: { module: true },
      orderBy: { createdAt: 'desc' }
    });
    
    return reply.status(200).send({
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        tenantId: sub.tenantId,
        module: {
          id: sub.module.id,
          code: sub.module.code,
          name: sub.module.name,
          description: sub.module.description
        },
        plan: sub.plan,
        status: sub.status,
        validFrom: sub.validFrom.toISOString(),
        validTo: sub.validTo?.toISOString()
      }))
    });
  });
  
  // POST /tenant-modules
  fastify.post('/tenant-modules', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['moduleCode', 'plan'],
        properties: {
          moduleCode: { type: 'string' },
          plan: { type: 'string', enum: ['basic', 'premium'] }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { moduleCode, plan } = request.body as { moduleCode: string; plan: string };
    
    // Find Module
    const module = await prisma.module.findUnique({
      where: { code: moduleCode }
    });
    
    if (!module) {
      throw new Error(`Module ${moduleCode} not found`);
    }
    
    // Create Subscription
    const subscription = await prisma.tenantModule.create({
      data: {
        tenantId: user.tenantId,
        moduleId: module.id,
        plan,
        status: 'active',
        validFrom: new Date(),
        validTo: null // TODO: Berechne basierend auf Plan
      },
      include: { module: true }
    });
    
    return reply.status(201).send({
      id: subscription.id,
      tenantId: subscription.tenantId,
      module: {
        id: subscription.module.id,
        code: subscription.module.code,
        name: subscription.module.name
      },
      plan: subscription.plan,
      status: subscription.status,
      validFrom: subscription.validFrom.toISOString(),
      validTo: subscription.validTo?.toISOString()
    });
  });
  
  // DELETE /tenant-modules/:id
  fastify.delete('/tenant-modules/:id', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    // const user = request.user!; // TODO: Use for authorization check
    const { id } = request.params as { id: string };
    
    await prisma.tenantModule.update({
      where: { id },
      data: { status: 'cancelled' }
    });
    
    return reply.status(204).send();
  });
}

