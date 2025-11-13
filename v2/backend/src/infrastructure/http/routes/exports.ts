import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { ProblemDetailsFactory } from '../errors/ProblemDetails';
import { StartExportUseCase } from '@/app/use-cases/exports/StartExportUseCase';
import { ExportRepository } from '@/infrastructure/db/repositories/ExportRepository';
import { FeatureGate } from '@/app/policies/FeatureGate';
import { TenantModuleRepository } from '@/infrastructure/db/repositories/TenantModuleRepository';
import { ExportService } from '@/infrastructure/exports/ExportService';
import { PatientRepository } from '@/infrastructure/db/repositories/PatientRepository';
import { EncounterRepository } from '@/infrastructure/db/repositories/EncounterRepository';

/**
 * Export Routes
 * 
 * POST /exports
 * GET /exports
 * GET /exports/:id
 * GET /exports/:id/download
 */
export async function exportRoutes(fastify: FastifyInstance): Promise<void> {
  // Dependency Injection
  const exportRepository = new ExportRepository();
  const tenantModuleRepository = new TenantModuleRepository();
  const patientRepository = new PatientRepository();
  const encounterRepository = new EncounterRepository();
  const featureGate = new FeatureGate(tenantModuleRepository);
  const exportService = new ExportService(patientRepository, encounterRepository, exportRepository);
  const startExportUseCase = new StartExportUseCase(exportRepository, featureGate, exportService);
  
  // POST /exports
  fastify.post('/exports', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['format'],
        properties: {
          format: { type: 'string', enum: ['json', 'ndjson', 'fhir'] },
          includeDeleted: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user!;
      const { format, includeDeleted } = request.body as { format: 'json' | 'ndjson' | 'fhir'; includeDeleted?: boolean };
      
      const result = await startExportUseCase.execute(format, user, includeDeleted || false);
      
      return reply.status(202).send(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('does not have subscription')) {
          throw ProblemDetailsFactory.paymentRequired(error.message, request.url);
        }
      }
      throw error;
    }
  });
  
  // GET /exports
  fastify.get('/exports', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const exports = await exportRepository.findByTenant(user.tenantId);
    
    return reply.status(200).send({ exports });
  });
  
  // GET /exports/:id
  fastify.get('/exports/:id', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const exportRecord = await exportRepository.findById(id, user.tenantId);
    if (!exportRecord) {
      throw ProblemDetailsFactory.notFound('Export', id, request.url);
    }
    
    return reply.status(200).send(exportRecord);
  });
  
  // GET /exports/:id/download
  fastify.get('/exports/:id/download', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const exportRecord = await exportRepository.findById(id, user.tenantId);
    if (!exportRecord) {
      throw ProblemDetailsFactory.notFound('Export', id, request.url);
    }
    
    if (exportRecord.status !== 'completed') {
      throw ProblemDetailsFactory.badRequest('Export not yet completed', request.url);
    }
    
    if (!exportRecord.filePath) {
      throw ProblemDetailsFactory.badRequest('Export file not found', request.url);
    }
    
    // TODO: File download implementieren
    return reply.status(200).send({ message: 'Download not yet implemented' });
  });
}

