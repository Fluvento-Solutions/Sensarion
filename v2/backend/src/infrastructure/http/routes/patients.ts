import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { ProblemDetailsFactory } from '../errors/ProblemDetails';
import { CreatePatientUseCase } from '@/app/use-cases/patients/CreatePatientUseCase';
import { UpdatePatientUseCase } from '@/app/use-cases/patients/UpdatePatientUseCase';
import { ListPatientsUseCase } from '@/app/use-cases/patients/ListPatientsUseCase';
import { PatientRepository } from '@/infrastructure/db/repositories/PatientRepository';
import { AuthZGuard } from '@/app/policies/AuthZGuard';
import { FeatureGate } from '@/app/policies/FeatureGate';
import { TenantModuleRepository } from '@/infrastructure/db/repositories/TenantModuleRepository';

/**
 * Patient Routes
 * 
 * GET /patients
 * POST /patients
 * GET /patients/:id
 * PATCH /patients/:id
 * DELETE /patients/:id
 */
export async function patientRoutes(fastify: FastifyInstance): Promise<void> {
  // Dependency Injection (TODO: Use IoC Container)
  const patientRepository = new PatientRepository();
  const tenantModuleRepository = new TenantModuleRepository();
  const authzGuard = new AuthZGuard();
  const featureGate = new FeatureGate(tenantModuleRepository);
  const createPatientUseCase = new CreatePatientUseCase(patientRepository, authzGuard, featureGate);
  const updatePatientUseCase = new UpdatePatientUseCase(patientRepository, authzGuard, featureGate);
  const listPatientsUseCase = new ListPatientsUseCase(patientRepository, authzGuard, featureGate);
  
  // GET /patients
  fastify.get('/patients', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { q, limit, offset } = request.query as { q?: string; limit?: number; offset?: number };
    
    const result = await listPatientsUseCase.execute(user.tenantId, user, {
      search: q,
      limit,
      offset
    });
    
    return reply.status(200).send(result);
  });
  
  // POST /patients
  fastify.post('/patients', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'birthDate'],
        properties: {
          name: {
            type: 'object',
            required: ['given', 'family'],
            properties: {
              given: { type: 'array', items: { type: 'string' } },
              family: { type: 'string' }
            }
          },
          birthDate: { type: 'string', format: 'date' },
          gender: { type: 'string', enum: ['m', 'w', 'd'] },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user!;
      const dto = request.body as any;
      
      const result = await createPatientUseCase.execute(dto, user);
      
      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('does not have permission')) {
          throw ProblemDetailsFactory.forbidden(error.message, request.url);
        }
        if (error.message.includes('does not have subscription')) {
          throw ProblemDetailsFactory.paymentRequired(error.message, request.url);
        }
      }
      throw error;
    }
  });
  
  // GET /patients/:id
  fastify.get('/patients/:id', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const { PatientDTO: PatientDTOClass } = await import('@/app/dto/PatientDTO');
    return reply.status(200).send(PatientDTOClass.fromDomain(patient));
  });
  
  // PATCH /patients/:id
  fastify.patch('/patients/:id', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      headers: {
        type: 'object',
        properties: {
          'if-match': { type: 'string' }
        },
        required: ['if-match']
      },
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'object',
            properties: {
              given: { type: 'array', items: { type: 'string' } },
              family: { type: 'string' }
            }
          },
          birthDate: { type: 'string', format: 'date' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user!;
      const { id } = request.params as { id: string };
      const ifMatch = request.headers['if-match'] as string;
      const expectedVersion = parseInt(ifMatch, 10);
      
      if (isNaN(expectedVersion)) {
        throw ProblemDetailsFactory.badRequest('If-Match header must be a valid version number', request.url);
      }
      
      const dto = request.body as any;
      const result = await updatePatientUseCase.execute(id, dto, user, expectedVersion);
      
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Version mismatch')) {
          throw ProblemDetailsFactory.preconditionFailed(error.message, request.url);
        }
      }
      throw error;
    }
  });
  
  // DELETE /patients/:id
  fastify.delete('/patients/:id', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };
    
    await patientRepository.delete(id, user.tenantId, reason);
    
    return reply.status(204).send();
  });

  // ============================================================================
  // Vitalwerte Routes
  // ============================================================================
  
  // GET /patients/:id/vitals
  fastify.get('/patients/:id/vitals', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const vitalsHistory = patient.vitalsHistory || [];
    const activeVitals = vitalsHistory.filter((v: any) => !v.is_deleted && !v.deleted_at);
    
    return reply.status(200).send({ vitals: activeVitals });
  });
  
  // POST /patients/:id/vitals
  fastify.post('/patients/:id/vitals', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        properties: {
          bp_systolic: { type: 'number' },
          bp_diastolic: { type: 'number' },
          hr: { type: 'number' },
          temperature: { type: 'number' },
          spo2: { type: 'number' },
          glucose: { type: 'number' },
          weight: { type: 'number' },
          height: { type: 'number' },
          bmi: { type: 'number' },
          pain_scale: { type: 'number', minimum: 1, maximum: 10 },
          pmh_responses: { type: 'array', items: { type: 'number', minimum: 0, maximum: 3 }, maxItems: 9 },
          pmh_total: { type: 'number', minimum: 0, maximum: 27 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user!;
      const { id } = request.params as { id: string };
      const dto = request.body as any;
      
      const patient = await patientRepository.findById(id, user.tenantId);
      if (!patient) {
        throw ProblemDetailsFactory.notFound('Patient', id, request.url);
      }
      
      const vitalsHistory = [...(patient.vitalsHistory || [])];
      const newVital = {
        id: `vital-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        recordedAt: new Date().toISOString(),
        ...dto,
        is_deleted: false,
        deleted_at: null
      };
      
      vitalsHistory.push(newVital);
      
      // Update vitalsLatest (only include fields that are present in dto)
      const vitalsLatest: any = {
        updated_at: new Date().toISOString()
      };
      
      if (dto.bp_systolic !== undefined) vitalsLatest.bp_systolic = dto.bp_systolic;
      if (dto.bp_diastolic !== undefined) vitalsLatest.bp_diastolic = dto.bp_diastolic;
      if (dto.hr !== undefined) vitalsLatest.hr = dto.hr;
      if (dto.temperature !== undefined) vitalsLatest.temperature = dto.temperature;
      if (dto.spo2 !== undefined) vitalsLatest.spo2 = dto.spo2;
      if (dto.glucose !== undefined) vitalsLatest.glucose = dto.glucose;
      if (dto.weight !== undefined) vitalsLatest.weight = dto.weight;
      if (dto.height !== undefined) vitalsLatest.height = dto.height;
      if (dto.bmi !== undefined) vitalsLatest.bmi = dto.bmi;
      if (dto.pain_scale !== undefined) vitalsLatest.pain_scale = dto.pain_scale;
      if (dto.pmh_responses !== undefined) vitalsLatest.pmh_responses = dto.pmh_responses;
      if (dto.pmh_total !== undefined) vitalsLatest.pmh_total = dto.pmh_total;
      
      // Update patient directly with Prisma
      const { prisma } = await import('@/infrastructure/db/client');
      await prisma.patient.update({
        where: { id: patient.id as string },
        data: {
          vitalsHistory,
          vitalsLatest,
          version: { increment: 1 }
        }
      });
      
      return reply.status(201).send({ vital: newVital });
    } catch (error: any) {
      console.error('[Patients] Error creating vital:', {
        error: error?.message,
        stack: error?.stack,
        code: error?.code,
        meta: error?.meta
      });
      
      if (error?.code === 'P2002') {
        throw ProblemDetailsFactory.conflict('Vital conflict', request.url);
      }
      if (error?.code?.startsWith('P')) {
        throw ProblemDetailsFactory.badRequest(`Database error: ${error.message}`, request.url);
      }
      
      // Re-throw if it's already a ProblemDetails
      if (error?.status) {
        throw error;
      }
      
      throw ProblemDetailsFactory.internalServerError(
        error?.message || 'Fehler beim Erstellen der Vitalwerte',
        request.url
      );
    }
  });
  
  // PATCH /patients/:id/vitals/:vitalId
  fastify.patch('/patients/:id/vitals/:vitalId', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 1 },
          bp_systolic: { type: 'number' },
          bp_diastolic: { type: 'number' },
          hr: { type: 'number' },
          temperature: { type: 'number' },
          spo2: { type: 'number' },
          glucose: { type: 'number' },
          weight: { type: 'number' },
          height: { type: 'number' },
          bmi: { type: 'number' },
          pain_scale: { type: 'number', minimum: 1, maximum: 10 },
          pmh_responses: { type: 'array', items: { type: 'number' } },
          pmh_total: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id, vitalId } = request.params as { id: string; vitalId: string };
    const { reason, ...updateFields } = request.body as any;
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const vitalsHistory = [...(patient.vitalsHistory || [])];
    const vitalIndex = vitalsHistory.findIndex((v: any) => v.id === vitalId);
    
    if (vitalIndex === -1) {
      throw ProblemDetailsFactory.notFound('Vital', vitalId, request.url);
    }
    
    const oldVital = vitalsHistory[vitalIndex];
    vitalsHistory[vitalIndex] = {
      ...oldVital,
      ...updateFields
    };
    
    // Update vitalsLatest if this is the newest entry
    const sortedVitals = [...vitalsHistory].filter((v: any) => !v.is_deleted).sort((a: any, b: any) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    
    const { prisma } = await import('@/infrastructure/db/client');
    
    if (sortedVitals.length > 0 && sortedVitals[0].id === oldVital.id) {
      const vitalsLatest = {
        ...updateFields,
        updated_at: new Date().toISOString()
      };
      
      await prisma.patient.update({
        where: { id: patient.id as string },
        data: {
          vitalsHistory,
          vitalsLatest,
          version: { increment: 1 }
        }
      });
    } else {
      await prisma.patient.update({
        where: { id: patient.id as string },
        data: {
          vitalsHistory,
          version: { increment: 1 }
        }
      });
    }
    
    return reply.status(200).send({ vital: vitalsHistory[vitalIndex] });
  });
  
  // DELETE /patients/:id/vitals/:vitalId
  fastify.delete('/patients/:id/vitals/:vitalId', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id, vitalId } = request.params as { id: string; vitalId: string };
    const { reason } = request.body as { reason: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const vitalsHistory = [...(patient.vitalsHistory || [])];
    const vitalIndex = vitalsHistory.findIndex((v: any) => v.id === vitalId);
    
    if (vitalIndex === -1) {
      throw ProblemDetailsFactory.notFound('Vital', vitalId, request.url);
    }
    
    const vital = vitalsHistory[vitalIndex];
    vitalsHistory[vitalIndex] = {
      ...vital,
      is_deleted: true,
      deleted_at: new Date().toISOString()
    };
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        vitalsHistory,
        version: { increment: 1 }
      }
    });
    
    return reply.status(200).send({ message: 'Vitalwerte gelöscht' });
  });

  // ============================================================================
  // Allergien Routes
  // ============================================================================
  
  // GET /patients/:id/allergies
  fastify.get('/patients/:id/allergies', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const allergies = patient.allergies || [];
    const activeAllergies = allergies.filter((a: any) => !a.is_deleted && !a.deleted_at);
    
    return reply.status(200).send({ allergies: activeAllergies });
  });
  
  // POST /patients/:id/allergies
  fastify.post('/patients/:id/allergies', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['substance', 'severity'],
        properties: {
          substance: { type: 'string', minLength: 1 },
          severity: { type: 'string', minLength: 1 },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const dto = request.body as any;
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const allergies = [...(patient.allergies || [])];
    const newAllergy = {
      id: `allergy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...dto,
      is_deleted: false,
      deleted_at: null
    };
    
    allergies.push(newAllergy);
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        allergies,
        version: { increment: 1 }
      }
    });
    
    return reply.status(201).send({ allergy: newAllergy });
  });
  
  // PATCH /patients/:id/allergies/:allergyId
  fastify.patch('/patients/:id/allergies/:allergyId', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['reason', 'substance', 'severity'],
        properties: {
          reason: { type: 'string', minLength: 1 },
          substance: { type: 'string', minLength: 1 },
          severity: { type: 'string', minLength: 1 },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id, allergyId } = request.params as { id: string; allergyId: string };
    const { reason, ...updateFields } = request.body as any;
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const allergies = [...(patient.allergies || [])];
    const allergyIndex = allergies.findIndex((a: any) => a.id === allergyId);
    
    if (allergyIndex === -1) {
      throw ProblemDetailsFactory.notFound('Allergy', allergyId, request.url);
    }
    
    allergies[allergyIndex] = {
      ...allergies[allergyIndex],
      ...updateFields
    };
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        allergies,
        version: { increment: 1 }
      }
    });
    
    return reply.status(200).send({ allergy: allergies[allergyIndex] });
  });
  
  // DELETE /patients/:id/allergies/:allergyId
  fastify.delete('/patients/:id/allergies/:allergyId', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id, allergyId } = request.params as { id: string; allergyId: string };
    const { reason } = request.body as { reason: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const allergies = [...(patient.allergies || [])];
    const allergyIndex = allergies.findIndex((a: any) => a.id === allergyId);
    
    if (allergyIndex === -1) {
      throw ProblemDetailsFactory.notFound('Allergy', allergyId, request.url);
    }
    
    const allergy = allergies[allergyIndex];
    allergies[allergyIndex] = {
      ...allergy,
      is_deleted: true,
      deleted_at: new Date().toISOString()
    };
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        allergies,
        version: { increment: 1 }
      }
    });
    
    return reply.status(200).send({ message: 'Allergie gelöscht' });
  });

  // ============================================================================
  // Medikationen Routes
  // ============================================================================
  
  // GET /patients/:id/medications
  fastify.get('/patients/:id/medications', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const medications = patient.medications || [];
    const activeMedications = medications.filter((m: any) => !m.is_deleted && !m.deleted_at);
    
    return reply.status(200).send({ medications: activeMedications });
  });
  
  // POST /patients/:id/medications
  fastify.post('/patients/:id/medications', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          dose: { type: 'string' },
          dose_morning: { type: 'string' },
          dose_midday: { type: 'string' },
          dose_evening: { type: 'string' },
          dose_night: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const dto = request.body as any;
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    // Validate: at least one dose must be provided
    if (!dto.dose && !dto.dose_morning && !dto.dose_midday && !dto.dose_evening && !dto.dose_night) {
      throw ProblemDetailsFactory.badRequest('Mindestens eine Dosierung muss angegeben sein', request.url);
    }
    
    const medications = [...(patient.medications || [])];
    const newMedication = {
      id: `medication-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...dto,
      is_deleted: false,
      deleted_at: null
    };
    
    medications.push(newMedication);
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        medications,
        version: { increment: 1 }
      }
    });
    
    return reply.status(201).send({ medication: newMedication });
  });
  
  // PATCH /patients/:id/medications/:medicationId
  fastify.patch('/patients/:id/medications/:medicationId', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['reason', 'name'],
        properties: {
          reason: { type: 'string', minLength: 1 },
          name: { type: 'string', minLength: 1 },
          dose: { type: 'string' },
          dose_morning: { type: 'string' },
          dose_midday: { type: 'string' },
          dose_evening: { type: 'string' },
          dose_night: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id, medicationId } = request.params as { id: string; medicationId: string };
    const { reason, ...updateFields } = request.body as any;
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    // Validate: at least one dose must be provided
    if (!updateFields.dose && !updateFields.dose_morning && !updateFields.dose_midday && !updateFields.dose_evening && !updateFields.dose_night) {
      throw ProblemDetailsFactory.badRequest('Mindestens eine Dosierung muss angegeben sein', request.url);
    }
    
    const medications = [...(patient.medications || [])];
    const medicationIndex = medications.findIndex((m: any) => m.id === medicationId);
    
    if (medicationIndex === -1) {
      throw ProblemDetailsFactory.notFound('Medication', medicationId, request.url);
    }
    
    medications[medicationIndex] = {
      ...medications[medicationIndex],
      ...updateFields
    };
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        medications,
        version: { increment: 1 }
      }
    });
    
    return reply.status(200).send({ medication: medications[medicationIndex] });
  });
  
  // DELETE /patients/:id/medications/:medicationId
  fastify.delete('/patients/:id/medications/:medicationId', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id, medicationId } = request.params as { id: string; medicationId: string };
    const { reason } = request.body as { reason: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const medications = [...(patient.medications || [])];
    const medicationIndex = medications.findIndex((m: any) => m.id === medicationId);
    
    if (medicationIndex === -1) {
      throw ProblemDetailsFactory.notFound('Medication', medicationId, request.url);
    }
    
    const medication = medications[medicationIndex];
    medications[medicationIndex] = {
      ...medication,
      is_deleted: true,
      deleted_at: new Date().toISOString()
    };
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        medications,
        version: { increment: 1 }
      }
    });
    
    return reply.status(200).send({ message: 'Medikation gelöscht' });
  });

  // ============================================================================
  // Diagnosen Routes
  // ============================================================================
  
  // GET /patients/:id/diagnoses
  fastify.get('/patients/:id/diagnoses', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const diagnoses = patient.diagnoses || [];
    const activeDiagnoses = diagnoses.filter((d: any) => !d.is_deleted && !d.deleted_at);
    
    return reply.status(200).send({ diagnoses: activeDiagnoses });
  });
  
  // POST /patients/:id/diagnoses
  fastify.post('/patients/:id/diagnoses', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const dto = request.body as any;
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const diagnoses = [...(patient.diagnoses || [])];
    const newDiagnosis = {
      id: `diagnosis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: dto.text,
      created_at: new Date().toISOString(),
      is_deleted: false,
      deleted_at: null
    };
    
    diagnoses.push(newDiagnosis);
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        diagnoses,
        version: { increment: 1 }
      }
    });
    
    return reply.status(201).send({ diagnosis: newDiagnosis });
  });
  
  // PATCH /patients/:id/diagnoses/:diagnosisId
  fastify.patch('/patients/:id/diagnoses/:diagnosisId', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['reason', 'text'],
        properties: {
          reason: { type: 'string', minLength: 1 },
          text: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id, diagnosisId } = request.params as { id: string; diagnosisId: string };
    const { reason, ...updateFields } = request.body as any;
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const diagnoses = [...(patient.diagnoses || [])];
    const diagnosisIndex = diagnoses.findIndex((d: any) => d.id === diagnosisId);
    
    if (diagnosisIndex === -1) {
      throw ProblemDetailsFactory.notFound('Diagnosis', diagnosisId, request.url);
    }
    
    diagnoses[diagnosisIndex] = {
      ...diagnoses[diagnosisIndex],
      ...updateFields
    };
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        diagnoses,
        version: { increment: 1 }
      }
    });
    
    return reply.status(200).send({ diagnosis: diagnoses[diagnosisIndex] });
  });
  
  // DELETE /patients/:id/diagnoses/:diagnosisId
  fastify.delete('/patients/:id/diagnoses/:diagnosisId', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id, diagnosisId } = request.params as { id: string; diagnosisId: string };
    const { reason } = request.body as { reason: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const diagnoses = [...(patient.diagnoses || [])];
    const diagnosisIndex = diagnoses.findIndex((d: any) => d.id === diagnosisId);
    
    if (diagnosisIndex === -1) {
      throw ProblemDetailsFactory.notFound('Diagnosis', diagnosisId, request.url);
    }
    
    const diagnosis = diagnoses[diagnosisIndex];
    diagnoses[diagnosisIndex] = {
      ...diagnosis,
      is_deleted: true,
      deleted_at: new Date().toISOString()
    };
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        diagnoses,
        version: { increment: 1 }
      }
    });
    
    return reply.status(200).send({ message: 'Diagnose gelöscht' });
  });

  // ============================================================================
  // Befunde Routes
  // ============================================================================
  
  // GET /patients/:id/findings
  fastify.get('/patients/:id/findings', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const findings = patient.findings || [];
    const activeFindings = findings.filter((f: any) => !f.is_deleted && !f.deleted_at);
    
    return reply.status(200).send({ findings: activeFindings });
  });
  
  // POST /patients/:id/findings
  fastify.post('/patients/:id/findings', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const dto = request.body as any;
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const findings = [...(patient.findings || [])];
    const newFinding = {
      id: `finding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: dto.text,
      created_at: new Date().toISOString(),
      is_deleted: false,
      deleted_at: null
    };
    
    findings.push(newFinding);
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        findings,
        version: { increment: 1 }
      }
    });
    
    return reply.status(201).send({ finding: newFinding });
  });
  
  // PATCH /patients/:id/findings/:findingId
  fastify.patch('/patients/:id/findings/:findingId', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['reason', 'text'],
        properties: {
          reason: { type: 'string', minLength: 1 },
          text: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id, findingId } = request.params as { id: string; findingId: string };
    const { reason, ...updateFields } = request.body as any;
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const findings = [...(patient.findings || [])];
    const findingIndex = findings.findIndex((f: any) => f.id === findingId);
    
    if (findingIndex === -1) {
      throw ProblemDetailsFactory.notFound('Finding', findingId, request.url);
    }
    
    findings[findingIndex] = {
      ...findings[findingIndex],
      ...updateFields
    };
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        findings,
        version: { increment: 1 }
      }
    });
    
    return reply.status(200).send({ finding: findings[findingIndex] });
  });
  
  // DELETE /patients/:id/findings/:findingId
  fastify.delete('/patients/:id/findings/:findingId', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id, findingId } = request.params as { id: string; findingId: string };
    const { reason } = request.body as { reason: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const findings = [...(patient.findings || [])];
    const findingIndex = findings.findIndex((f: any) => f.id === findingId);
    
    if (findingIndex === -1) {
      throw ProblemDetailsFactory.notFound('Finding', findingId, request.url);
    }
    
    const finding = findings[findingIndex];
    findings[findingIndex] = {
      ...finding,
      is_deleted: true,
      deleted_at: new Date().toISOString()
    };
    
    const { prisma } = await import('@/infrastructure/db/client');
    await prisma.patient.update({
      where: { id: patient.id as string },
      data: {
        findings,
        version: { increment: 1 }
      }
    });
    
    return reply.status(200).send({ message: 'Befund gelöscht' });
  });

  // ============================================================================
  // Notizen Routes
  // ============================================================================
  
  // GET /patients/:id/notes
  fastify.get('/patients/:id/notes', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const { prisma } = await import('@/infrastructure/db/client');
    const notes = await prisma.patientNote.findMany({
      where: { patientId: id },
      orderBy: { createdAt: 'desc' }
    });
    
    return reply.status(200).send({ notes });
  });
  
  // POST /patients/:id/notes
  fastify.post('/patients/:id/notes', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const dto = request.body as any;
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const { prisma } = await import('@/infrastructure/db/client');
    const note = await prisma.patientNote.create({
      data: {
        patientId: id,
        authorId: user.id,
        text: dto.text
      }
    });
    
    return reply.status(201).send({ note });
  });

  // ============================================================================
  // Encounters Routes
  // ============================================================================
  
  // GET /patients/:id/encounters
  fastify.get('/patients/:id/encounters', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const { prisma } = await import('@/infrastructure/db/client');
    const encounters = await prisma.encounter.findMany({
      where: { patientId: id },
      orderBy: { date: 'desc' }
    });
    
    return reply.status(200).send({ encounters });
  });
  
  // POST /patients/:id/encounters
  fastify.post('/patients/:id/encounters', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['date'],
        properties: {
          date: { type: 'string', format: 'date' },
          location: { type: 'string' },
          reason: { type: 'string' },
          summary: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const dto = request.body as any;
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const { prisma } = await import('@/infrastructure/db/client');
    const encounter = await prisma.encounter.create({
      data: {
        patientId: id,
        date: new Date(dto.date),
        location: dto.location,
        reason: dto.reason,
        summary: dto.summary
      }
    });
    
    return reply.status(201).send({ encounter });
  });

  // ============================================================================
  // Audit Logs Route
  // ============================================================================
  
  // GET /patients/:id/audit-logs
  fastify.get('/patients/:id/audit-logs', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const patient = await patientRepository.findById(id, user.tenantId);
    if (!patient) {
      throw ProblemDetailsFactory.notFound('Patient', id, request.url);
    }
    
    const { prisma } = await import('@/infrastructure/db/client');
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId: user.tenantId,
        entityType: 'patient',
        entityId: id
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    
    return reply.status(200).send({ logs });
  });
}

