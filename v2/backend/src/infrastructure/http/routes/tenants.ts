import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { ProblemDetailsFactory } from '../errors/ProblemDetails';
import { TenantRepository } from '@/infrastructure/db/repositories/TenantRepository';
import { Tenant } from '@/domain/entities/Tenant';

/**
 * Tenant Routes
 * 
 * GET /tenants - Liste Tenants (nur Super-Admin)
 * POST /tenants - Erstelle Tenant (nur Super-Admin)
 * GET /tenants/:id - Tenant-Details
 */
export async function tenantRoutes(fastify: FastifyInstance): Promise<void> {
  const tenantRepository = new TenantRepository();
  
  // GET /tenants
  fastify.get('/tenants', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    
    // TODO: Prüfe ob Super-Admin
    if (!user.roles.includes('admin')) {
      throw ProblemDetailsFactory.forbidden('Only super-admin can list tenants', request.url);
    }
    
    const tenants = await tenantRepository.findAll();
    
    return reply.status(200).send({
      tenants: tenants.map(t => ({
        id: t.id as string,
        name: t.name,
        code: t.code,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString()
      }))
    });
  });
  
  // POST /tenants
  fastify.post('/tenants', {
    preHandler: [authMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'code'],
        properties: {
          name: { type: 'string' },
          code: { type: 'string', pattern: '^[a-z0-9-]+$' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    
    // TODO: Prüfe ob Super-Admin
    if (!user.roles.includes('admin')) {
      throw ProblemDetailsFactory.forbidden('Only super-admin can create tenants', request.url);
    }
    
    const dto = request.body as { name: string; code: string };
    
    // Prüfe ob Code bereits existiert
    const existing = await tenantRepository.findByCode(dto.code);
    if (existing) {
      throw ProblemDetailsFactory.conflict(`Tenant with code ${dto.code} already exists`, request.url);
    }
    
    const tenant = Tenant.create(dto);
    const saved = await tenantRepository.save(tenant);
    
    return reply.status(201).send({
      id: saved.id as string,
      name: saved.name,
      code: saved.code,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString()
    });
  });
  
  // GET /tenants/:id
  fastify.get('/tenants/:id', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    // TODO: Prüfe ob Super-Admin oder eigener Tenant
    if (!user.roles.includes('admin') && user.tenantId !== id) {
      throw ProblemDetailsFactory.forbidden('Cannot access this tenant', request.url);
    }
    
    const tenant = await tenantRepository.findById(id);
    if (!tenant) {
      throw ProblemDetailsFactory.notFound('Tenant', id, request.url);
    }
    
    return reply.status(200).send({
      id: tenant.id as string,
      name: tenant.name,
      code: tenant.code,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString()
    });
  });
}

