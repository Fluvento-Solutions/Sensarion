import { Router, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { prisma } from '../db/client';

const router = Router();

type AuthenticatedRequest = Request & { authUserId: string };

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

// Extend AuthenticatedRequest
type AuthenticatedRequestWithUser = AuthenticatedRequest & { authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>> };

// Helper: Erstelle Audit-Log
const createAuditLog = (
  action: 'create' | 'update' | 'delete' | 'add' | 'remove',
  entityType: 'patient' | 'vital' | 'allergy' | 'medication' | 'note' | 'encounter' | 'diagnosis' | 'finding',
  entityId: string | undefined,
  entityName: string | undefined,
  description: string,
  author: string,
  changes?: Record<string, { old?: string; new?: string }>,
  reason?: string
) => {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    changes,
    author,
    description,
    reason: reason || undefined
  };
};

// Helper: Füge Audit-Log zum Patient hinzu
const addAuditLogToPatient = async (patientId: string, log: ReturnType<typeof createAuditLog>) => {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return;

  const auditLogs = ((patient as any).auditLogs || []) as any[];
  auditLogs.push(log);

  await prisma.patient.update({
    where: { id: patientId },
    data: { auditLogs: auditLogs as any }
  });
};

// Helper: Require auth middleware
const requireAuth = async (req: Request, res: Response, next: () => void) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentifizierung erforderlich',
      code: 'AUTH_REQUIRED'
    });
  }
  (req as AuthenticatedRequestWithUser).authUserId = user.id;
  (req as AuthenticatedRequestWithUser).authUser = user;
  next();
};

// Schemas
const createPatientSchema = z.object({
  name: z.object({
    given: z.array(z.string()),
    family: z.string()
  }),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['m', 'w', 'd']).optional(),
  tags: z.array(z.string()).optional().default([]),
  address: z.object({
    street: z.string().optional(),
    zip: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional()
  }).optional(),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    mobile: z.string().optional()
  }).optional(),
  insurance: z.object({
    number: z.string().optional(),
    type: z.string().optional(),
    provider: z.string().optional()
  }).optional(),
  vitalsLatest: z.record(z.unknown()).optional(),
  allergies: z.array(z.object({
    substance: z.string(),
    severity: z.string(),
    notes: z.string().optional()
  })).optional().default([]),
  medications: z.array(z.object({
    name: z.string(),
    dose: z.string()
  })).optional().default([])
});

const updatePatientSchema = createPatientSchema.partial().extend({
  reason: z.string().min(1, 'Grund für die Änderung ist erforderlich')
});

const createVitalSchema = z.object({
  bp_systolic: z.number().optional(),
  bp_diastolic: z.number().optional(),
  hr: z.number().optional(),
  temperature: z.number().optional(),
  spo2: z.number().optional(),
  glucose: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  bmi: z.number().optional(),
  pain_scale: z.number().min(1).max(10).optional(),
  pmh_responses: z.array(z.number().min(0).max(3)).length(9).optional(),
  pmh_total: z.number().min(0).max(27).optional()
});

const updateVitalSchema = createVitalSchema.extend({
  reason: z.string().min(1, 'Grund für die Änderung ist erforderlich')
});

const deleteVitalSchema = z.object({
  reason: z.string().min(1, 'Grund für die Löschung ist erforderlich')
});

const addAllergySchema = z.object({
  substance: z.string().min(1, 'Substanz erforderlich'),
  severity: z.string().min(1, 'Schweregrad erforderlich'),
  notes: z.string().optional()
});

const updateAllergySchema = z.object({
  substance: z.string().min(1, 'Substanz erforderlich'),
  severity: z.string().min(1, 'Schweregrad erforderlich'),
  notes: z.string().optional(),
  reason: z.string().min(1, 'Grund für die Änderung ist erforderlich')
});

const deleteAllergySchema = z.object({
  reason: z.string().min(1, 'Grund für die Löschung ist erforderlich')
});

const addMedicationSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  dose: z.string().optional(), // Legacy support
  dose_morning: z.string().optional(),
  dose_midday: z.string().optional(),
  dose_evening: z.string().optional(),
  dose_night: z.string().optional(),
  notes: z.string().optional()
}).refine(
  (data) => {
    // Mindestens eine Dosierung muss angegeben sein
    return data.dose || data.dose_morning || data.dose_midday || data.dose_evening || data.dose_night;
  },
  {
    message: 'Mindestens eine Dosierung muss angegeben sein'
  }
);

const updateMedicationSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  dose: z.string().optional(), // Legacy support
  dose_morning: z.string().optional(),
  dose_midday: z.string().optional(),
  dose_evening: z.string().optional(),
  dose_night: z.string().optional(),
  notes: z.string().optional(),
  reason: z.string().min(1, 'Grund für die Änderung ist erforderlich')
}).refine(
  (data) => {
    // Mindestens eine Dosierung muss angegeben sein
    return data.dose || data.dose_morning || data.dose_midday || data.dose_evening || data.dose_night;
  },
  {
    message: 'Mindestens eine Dosierung muss angegeben sein'
  }
);

const deleteMedicationSchema = z.object({
  reason: z.string().min(1, 'Grund für die Löschung ist erforderlich')
});

const createNoteSchema = z.object({
  text: z.string().min(1, 'Notiz-Text erforderlich')
});

const createEncounterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().optional(),
  reason: z.string().optional(),
  summary: z.string().optional()
});

const addDiagnosisSchema = z.object({
  text: z.string().min(1, 'Diagnose-Text erforderlich')
});

const updateDiagnosisSchema = z.object({
  text: z.string().min(1, 'Diagnose-Text erforderlich'),
  reason: z.string().min(1, 'Grund für die Änderung ist erforderlich')
});

const deleteDiagnosisSchema = z.object({
  reason: z.string().min(1, 'Grund für die Löschung ist erforderlich')
});

const addFindingSchema = z.object({
  text: z.string().min(1, 'Befund-Text erforderlich')
});

const updateFindingSchema = z.object({
  text: z.string().min(1, 'Befund-Text erforderlich'),
  reason: z.string().min(1, 'Grund für die Änderung ist erforderlich')
});

const deleteFindingSchema = z.object({
  reason: z.string().min(1, 'Grund für die Löschung ist erforderlich')
});

// GET /api/patients - Liste & Suche
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const q = (req.query.q as string) || '';
    const searchTerm = q.toLowerCase().trim();

    // Hole alle Patienten der Praxis
    const allPatients = await prisma.patient.findMany({
      where: {
        practiceId: user.practiceId
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });

    // Filtere im Memory (da JSON-Suche in Prisma komplex ist)
    const patients = searchTerm
      ? allPatients.filter(p => {
          const nameObj = p.name as { given?: string[]; family?: string };
          const givenNames = (nameObj.given || []).join(' ').toLowerCase();
          const familyName = (nameObj.family || '').toLowerCase();
          const fullName = `${givenNames} ${familyName}`.trim();
          const tagsStr = p.tags.join(' ').toLowerCase();
          
          return (
            p.id.toLowerCase().includes(searchTerm) ||
            fullName.includes(searchTerm) ||
            tagsStr.includes(searchTerm)
          );
        })
      : allPatients;

    return res.json({
      status: 'ok',
      patients: patients.map(p => {
        const allergies = (p.allergies as any[]) || [];
        const medications = (p.medications as any[]) || [];
        const activeAllergies = allergies.filter((a: any) => !a.is_deleted && !a.deleted_at);
        const activeMedications = medications.filter((m: any) => !m.is_deleted && !m.deleted_at);
        
        return {
          patient_id: p.id,
          version: p.version,
          name: p.name,
          birth_date: p.birthDate.toISOString().split('T')[0],
          gender: p.gender,
          tags: p.tags,
          address: p.address,
          contact: p.contact,
          insurance: p.insurance,
          vitals_latest: p.vitalsLatest,
          allergies: activeAllergies,
          medications: activeMedications
        };
      })
    });
  } catch (error) {
    console.error('get patients failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Patienten'
    });
  }
});

// POST /api/patients - Neuen Patienten erstellen
router.post('/', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = createPatientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.create({
      data: {
        practiceId: user.practiceId,
        name: parsed.data.name,
        birthDate: new Date(parsed.data.birthDate),
        gender: parsed.data.gender || null,
        tags: parsed.data.tags || [],
        address: parsed.data.address || null,
        contact: parsed.data.contact || null,
        insurance: parsed.data.insurance || null,
        vitalsLatest: parsed.data.vitalsLatest || null,
        vitalsHistory: [],
        allergies: parsed.data.allergies || [],
        medications: parsed.data.medications || []
      }
    });

    return res.status(201).json({
      status: 'ok',
      patient: {
        patient_id: patient.id,
        version: patient.version,
        name: patient.name,
        birth_date: patient.birthDate.toISOString().split('T')[0],
        gender: patient.gender,
        tags: patient.tags,
        address: patient.address,
        contact: patient.contact,
        insurance: patient.insurance,
        vitals_latest: patient.vitalsLatest,
        vitals_history: patient.vitalsHistory,
        allergies: patient.allergies,
        medications: patient.medications
      }
    });
  } catch (error) {
    console.error('create patient failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Erstellen des Patienten'
    });
  }
});

// GET /api/patients/:id - Patient-Details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    return res.json({
      status: 'ok',
      patient: {
        patient_id: patient.id,
        version: patient.version,
        name: patient.name,
        birth_date: patient.birthDate.toISOString().split('T')[0],
        gender: patient.gender,
        tags: patient.tags,
        address: patient.address,
        contact: patient.contact,
        insurance: patient.insurance,
        vitals_latest: patient.vitalsLatest,
        vitals_history: patient.vitalsHistory,
        allergies: patient.allergies,
        medications: patient.medications,
        diagnoses: patient.diagnoses,
        findings: patient.findings
      }
    });
  } catch (error) {
    console.error('get patient failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden des Patienten'
    });
  }
});

// PATCH /api/patients/:id - Update (mit optimistic locking)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const ifMatch = req.headers['if-match'];
    if (!ifMatch) {
      return res.status(428).json({
        status: 'error',
        message: 'If-Match Header erforderlich für Updates'
      });
    }

    const expectedVersion = parseInt(ifMatch, 10);
    if (isNaN(expectedVersion)) {
      return res.status(400).json({
        status: 'error',
        message: 'Ungültige Version im If-Match Header'
      });
    }

    const parsed = updatePatientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    // Prüfe aktuelle Version
    const current = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!current) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    if (current.version !== expectedVersion) {
      return res.status(412).json({
        status: 'error',
        message: 'Version-Konflikt. Patient wurde zwischenzeitlich geändert.',
        currentVersion: current.version
      });
    }

    const { reason, ...updateFields } = parsed.data;
    
    const updateData: Prisma.PatientUpdateInput = {
      version: { increment: 1 }
    };

    if (updateFields.name) updateData.name = updateFields.name;
    if (updateFields.birthDate) updateData.birthDate = new Date(updateFields.birthDate);
    if (updateFields.gender !== undefined) updateData.gender = updateFields.gender;
    if (updateFields.tags !== undefined) updateData.tags = updateFields.tags;
    if (updateFields.address !== undefined) updateData.address = updateFields.address;
    if (updateFields.contact !== undefined) updateData.contact = updateFields.contact;
    if (updateFields.insurance !== undefined) updateData.insurance = updateFields.insurance;
    if (updateFields.vitalsLatest !== undefined) updateData.vitalsLatest = updateFields.vitalsLatest;
    if (updateFields.allergies !== undefined) updateData.allergies = updateFields.allergies;
    if (updateFields.medications !== undefined) updateData.medications = updateFields.medications;

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: updateData
    });

    // Audit-Log erstellen
    const changes: Record<string, { old?: string; new?: string }> = {};
    if (updateFields.name && JSON.stringify(current.name) !== JSON.stringify(updateFields.name)) {
      changes.name = { 
        old: JSON.stringify(current.name), 
        new: JSON.stringify(updateFields.name) 
      };
    }
    if (updateFields.birthDate && current.birthDate.toISOString().split('T')[0] !== updateFields.birthDate) {
      changes.birthDate = { 
        old: current.birthDate.toISOString().split('T')[0], 
        new: updateFields.birthDate 
      };
    }
    if (updateFields.gender !== undefined && current.gender !== updateFields.gender) {
      changes.gender = { old: current.gender || '', new: updateFields.gender || '' };
    }

    const nameObj = current.name as { given?: string[]; family?: string };
    const patientName = `${(nameObj.given || []).join(' ')} ${nameObj.family || ''}`.trim();

    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'update',
        'patient',
        req.params.id,
        patientName,
        `Patientendaten geändert`,
        user.shortName || user.displayName,
        Object.keys(changes).length > 0 ? changes : undefined,
        reason
      )
    );

    return res.json({
      status: 'ok',
      patient: {
        patient_id: patient.id,
        version: patient.version,
        name: patient.name,
        birth_date: patient.birthDate.toISOString().split('T')[0],
        gender: patient.gender,
        tags: patient.tags,
        address: patient.address,
        contact: patient.contact,
        insurance: patient.insurance,
        vitals_latest: patient.vitalsLatest,
        vitals_history: patient.vitalsHistory,
        allergies: patient.allergies,
        medications: patient.medications,
        diagnoses: patient.diagnoses,
        findings: patient.findings
      }
    });
  } catch (error) {
    console.error('update patient failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Aktualisieren des Patienten'
    });
  }
});

// GET /api/patients/:id/notes - Notizen auflisten
router.get('/:id/notes', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    // Prüfe ob Patient existiert und zur Praxis gehört
    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const notes = await prisma.patientNote.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      status: 'ok',
      notes: notes.map(n => ({
        note_id: n.id,
        created_at: n.createdAt.toISOString(),
        author: n.authorId,
        text: n.text
      }))
    });
  } catch (error) {
    console.error('get notes failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Notizen'
    });
  }
});

// POST /api/patients/:id/notes - Notiz hinzufügen
router.post('/:id/notes', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = createNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    // Prüfe ob Patient existiert und zur Praxis gehört
    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const note = await prisma.patientNote.create({
      data: {
        patientId: req.params.id,
        authorId: user.id,
        text: parsed.data.text
      }
    });

    return res.status(201).json({
      status: 'ok',
      note: {
        note_id: note.id,
        created_at: note.createdAt.toISOString(),
        author: note.authorId,
        text: note.text
      }
    });
  } catch (error) {
    console.error('create note failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Erstellen der Notiz'
    });
  }
});

// GET /api/patients/:id/encounters - Encounters auflisten
router.get('/:id/encounters', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    // Prüfe ob Patient existiert und zur Praxis gehört
    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const encounters = await prisma.encounter.findMany({
      where: { patientId: req.params.id },
      orderBy: { date: 'desc' }
    });

    return res.json({
      status: 'ok',
      encounters: encounters.map(e => ({
        encounter_id: e.id,
        date: e.date.toISOString().split('T')[0],
        location: e.location,
        reason: e.reason,
        summary: e.summary
      }))
    });
  } catch (error) {
    console.error('get encounters failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Encounters'
    });
  }
});

// POST /api/patients/:id/encounters - Encounter hinzufügen
router.post('/:id/encounters', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = createEncounterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    // Prüfe ob Patient existiert und zur Praxis gehört
    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const encounter = await prisma.encounter.create({
      data: {
        patientId: req.params.id,
        date: new Date(parsed.data.date),
        location: parsed.data.location || null,
        reason: parsed.data.reason || null,
        summary: parsed.data.summary || null
      }
    });

    return res.status(201).json({
      status: 'ok',
      encounter: {
        encounter_id: encounter.id,
        date: encounter.date.toISOString().split('T')[0],
        location: encounter.location,
        reason: encounter.reason,
        summary: encounter.summary
      }
    });
  } catch (error) {
    console.error('create encounter failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Erstellen des Encounters'
    });
  }
});

// GET /api/patients/:id/vitals - Vitalwerte-Historie abrufen
router.get('/:id/vitals', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const vitalsHistory = (patient.vitalsHistory as unknown[]) || [];
    // Filtere gelöschte Einträge
    const activeVitals = vitalsHistory.filter((v: any) => !v.is_deleted && !v.deleted_at);

    return res.json({
      status: 'ok',
      vitals: activeVitals
    });
  } catch (error) {
    console.error('get vitals failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Vitalwerte'
    });
  }
});

// POST /api/patients/:id/vitals - Vitalwerte hinzufügen
router.post('/:id/vitals', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = createVitalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const vitalsHistory = (patient.vitalsHistory as unknown[]) || [];
    const newVital = {
      id: `vital-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recordedAt: new Date().toISOString(),
      ...parsed.data,
      is_deleted: false,
      deleted_at: null
    };

    vitalsHistory.push(newVital);

    // Update vitalsLatest
    const vitalsLatest = {
      bp_systolic: parsed.data.bp_systolic,
      bp_diastolic: parsed.data.bp_diastolic,
      hr: parsed.data.hr,
      temperature: parsed.data.temperature,
      spo2: parsed.data.spo2,
      glucose: parsed.data.glucose,
      weight: parsed.data.weight,
      height: parsed.data.height,
      bmi: parsed.data.bmi,
      pain_scale: parsed.data.pain_scale,
      pmh_responses: parsed.data.pmh_responses,
      pmh_total: parsed.data.pmh_total,
      updated_at: new Date().toISOString()
    };

    await prisma.patient.update({
      where: { id: req.params.id },
      data: {
        vitalsHistory,
        vitalsLatest
      }
    });

    // Audit-Log erstellen
    const vitalDesc = [
      parsed.data.bp_systolic && parsed.data.bp_diastolic ? `RR: ${parsed.data.bp_systolic}/${parsed.data.bp_diastolic}` : null,
      parsed.data.hr ? `Puls: ${parsed.data.hr}` : null,
      parsed.data.temperature ? `Temp: ${parsed.data.temperature}°C` : null,
      parsed.data.spo2 ? `SpO2: ${parsed.data.spo2}%` : null
    ].filter(Boolean).join(', ') || 'Vitalwerte';

    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'add',
        'vital',
        newVital.id,
        'Vitalwerte',
        `Vitalwerte erfasst: ${vitalDesc}`,
        user.shortName || user.displayName
      )
    );

    return res.status(201).json({
      status: 'ok',
      vital: newVital
    });
  } catch (error) {
    console.error('create vital failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Erstellen der Vitalwerte'
    });
  }
});

// PATCH /api/patients/:id/vitals/:vitalId - Vitalwerte bearbeiten
router.patch('/:id/vitals/:vitalId', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateVitalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const vitalsHistory = (patient.vitalsHistory as any[]) || [];
    const vitalIndex = vitalsHistory.findIndex(v => v.id === req.params.vitalId);

    if (vitalIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Vitalwerte nicht gefunden'
      });
    }

    const oldVital = vitalsHistory[vitalIndex];
    const { reason, ...updateFields } = parsed.data;
    const changes: Record<string, { old?: string; new?: string }> = {};
    
    Object.keys(updateFields).forEach(key => {
      const typedKey = key as keyof typeof updateFields;
      if (updateFields[typedKey] !== undefined && oldVital[typedKey] !== updateFields[typedKey]) {
        changes[key] = {
          old: oldVital[typedKey]?.toString(),
          new: updateFields[typedKey]?.toString()
        };
      }
    });

    vitalsHistory[vitalIndex] = {
      ...oldVital,
      ...updateFields
    };

    // Update vitalsLatest wenn es der neueste Eintrag ist
    const sortedVitals = [...vitalsHistory].filter(v => !v.is_deleted).sort((a, b) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    if (sortedVitals.length > 0 && sortedVitals[0].id === oldVital.id) {
      const vitalsLatest = {
        bp_systolic: vitalsHistory[vitalIndex].bp_systolic,
        bp_diastolic: vitalsHistory[vitalIndex].bp_diastolic,
        hr: vitalsHistory[vitalIndex].hr,
        temperature: vitalsHistory[vitalIndex].temperature,
        spo2: vitalsHistory[vitalIndex].spo2,
        glucose: vitalsHistory[vitalIndex].glucose,
        bmi: vitalsHistory[vitalIndex].bmi,
        updated_at: new Date().toISOString()
      };

      await prisma.patient.update({
        where: { id: req.params.id },
        data: { vitalsHistory, vitalsLatest }
      });
    } else {
      await prisma.patient.update({
        where: { id: req.params.id },
        data: { vitalsHistory }
      });
    }

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'update',
        'vital',
        oldVital.id,
        'Vitalwerte',
        `Vitalwerte vom ${new Date(oldVital.recordedAt).toLocaleDateString('de-DE')} bearbeitet`,
        user.shortName || user.displayName,
        changes,
        reason
      )
    );

    return res.json({
      status: 'ok',
      vital: vitalsHistory[vitalIndex]
    });
  } catch (error) {
    console.error('update vital failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Bearbeiten der Vitalwerte'
    });
  }
});

// DELETE /api/patients/:id/vitals/:vitalId - Vitalwerte Soft Delete
router.delete('/:id/vitals/:vitalId', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = deleteVitalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const vitalsHistory = (patient.vitalsHistory as any[]) || [];
    const vitalIndex = vitalsHistory.findIndex(v => v.id === req.params.vitalId);

    if (vitalIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Vitalwerte nicht gefunden'
      });
    }

    const vital = vitalsHistory[vitalIndex];
    vitalsHistory[vitalIndex] = {
      ...vital,
      is_deleted: true,
      deleted_at: new Date().toISOString()
    };

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { vitalsHistory }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'remove',
        'vital',
        vital.id,
        'Vitalwerte',
        `Vitalwerte vom ${new Date(vital.recordedAt).toLocaleDateString('de-DE')} entfernt`,
        user.shortName || user.displayName,
        undefined,
        parsed.data.reason
      )
    );

    return res.json({
      status: 'ok',
      message: 'Vitalwerte gelöscht'
    });
  } catch (error) {
    console.error('delete vital failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Löschen der Vitalwerte'
    });
  }
});

// POST /api/patients/:id/allergies - Allergie hinzufügen
router.post('/:id/allergies', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = addAllergySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const allergies = (patient.allergies as any[]) || [];
    const newAllergy = {
      id: `allergy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...parsed.data,
      is_deleted: false,
      deleted_at: null
    };

    allergies.push(newAllergy);

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { allergies }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'add',
        'allergy',
        newAllergy.id,
        parsed.data.substance,
        `Allergie "${parsed.data.substance}" (${parsed.data.severity}) hinzugefügt`,
        user.shortName || user.displayName
      )
    );

    return res.status(201).json({
      status: 'ok',
      allergy: newAllergy
    });
  } catch (error) {
    console.error('add allergy failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Hinzufügen der Allergie'
    });
  }
});

// PATCH /api/patients/:id/allergies/:allergyId - Allergie bearbeiten
router.patch('/:id/allergies/:allergyId', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateAllergySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const allergies = (patient.allergies as any[]) || [];
    const allergyIndex = allergies.findIndex(a => a.id === req.params.allergyId);

    if (allergyIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Allergie nicht gefunden'
      });
    }

    const oldAllergy = allergies[allergyIndex];
    const { reason, ...updateFields } = parsed.data;
    const changes: Record<string, { old?: string; new?: string }> = {};
    
    if (oldAllergy.substance !== updateFields.substance) {
      changes.substance = { old: oldAllergy.substance, new: updateFields.substance };
    }
    if (oldAllergy.severity !== updateFields.severity) {
      changes.severity = { old: oldAllergy.severity, new: updateFields.severity };
    }

    allergies[allergyIndex] = {
      ...oldAllergy,
      ...updateFields
    };

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { allergies }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'update',
        'allergy',
        oldAllergy.id,
        updateFields.substance,
        `Allergie "${updateFields.substance}" bearbeitet`,
        user.shortName || user.displayName,
        changes,
        reason
      )
    );

    return res.json({
      status: 'ok',
      allergy: allergies[allergyIndex]
    });
  } catch (error) {
    console.error('update allergy failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Bearbeiten der Allergie'
    });
  }
});

// DELETE /api/patients/:id/allergies/:allergyId - Allergie Soft Delete
router.delete('/:id/allergies/:allergyId', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = deleteAllergySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const allergies = (patient.allergies as any[]) || [];
    const allergyIndex = allergies.findIndex(a => a.id === req.params.allergyId);

    if (allergyIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Allergie nicht gefunden'
      });
    }

    const allergy = allergies[allergyIndex];
    allergies[allergyIndex] = {
      ...allergy,
      is_deleted: true,
      deleted_at: new Date().toISOString()
    };

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { allergies }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'remove',
        'allergy',
        allergy.id,
        allergy.substance,
        `Allergie "${allergy.substance}" entfernt`,
        user.shortName || user.displayName,
        undefined,
        parsed.data.reason
      )
    );

    return res.json({
      status: 'ok',
      message: 'Allergie gelöscht'
    });
  } catch (error) {
    console.error('delete allergy failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Löschen der Allergie'
    });
  }
});

// POST /api/patients/:id/medications - Medikation hinzufügen
router.post('/:id/medications', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = addMedicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const medications = (patient.medications as any[]) || [];
    const newMedication = {
      id: `medication-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...parsed.data,
      is_deleted: false,
      deleted_at: null
    };

    medications.push(newMedication);

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { medications }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'add',
        'medication',
        newMedication.id,
        parsed.data.name,
        `Medikation "${parsed.data.name}" hinzugefügt`,
        user.shortName || user.displayName
      )
    );

    return res.status(201).json({
      status: 'ok',
      medication: newMedication
    });
  } catch (error) {
    console.error('add medication failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Hinzufügen der Medikation'
    });
  }
});

// PATCH /api/patients/:id/medications/:medicationId - Medikation bearbeiten
router.patch('/:id/medications/:medicationId', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateMedicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const medications = (patient.medications as any[]) || [];
    const medicationIndex = medications.findIndex(m => m.id === req.params.medicationId);

    if (medicationIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Medikation nicht gefunden'
      });
    }

    const oldMedication = medications[medicationIndex];
    const { reason, ...updateFields } = parsed.data;
    const changes: Record<string, { old?: string; new?: string }> = {};
    
    if (oldMedication.name !== updateFields.name) {
      changes.name = { old: oldMedication.name, new: updateFields.name };
    }

    medications[medicationIndex] = {
      ...oldMedication,
      ...updateFields
    };

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { medications }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'update',
        'medication',
        oldMedication.id,
        updateFields.name,
        `Medikation "${updateFields.name}" bearbeitet`,
        user.shortName || user.displayName,
        changes,
        reason
      )
    );

    return res.json({
      status: 'ok',
      medication: medications[medicationIndex]
    });
  } catch (error) {
    console.error('update medication failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Bearbeiten der Medikation'
    });
  }
});

// DELETE /api/patients/:id/medications/:medicationId - Medikation Soft Delete
router.delete('/:id/medications/:medicationId', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = deleteMedicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const medications = (patient.medications as any[]) || [];
    const medicationIndex = medications.findIndex(m => m.id === req.params.medicationId);

    if (medicationIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Medikation nicht gefunden'
      });
    }

    const medication = medications[medicationIndex];
    medications[medicationIndex] = {
      ...medication,
      is_deleted: true,
      deleted_at: new Date().toISOString()
    };

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { medications }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'remove',
        'medication',
        medication.id,
        medication.name,
        `Medikation "${medication.name}" entfernt`,
        user.shortName || user.displayName,
        undefined,
        parsed.data.reason
      )
    );

    return res.json({
      status: 'ok',
      message: 'Medikation gelöscht'
    });
  } catch (error) {
    console.error('delete medication failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Löschen der Medikation'
    });
  }
});

// GET /api/patients/:id/audit-logs - Audit-Logs abrufen
router.get('/:id/audit-logs', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    // Audit-Logs aus dem JSON-Feld lesen
    const auditLogs = ((patient as any).auditLogs || []) as any[];

    return res.json({
      status: 'ok',
      logs: auditLogs
    });
  } catch (error) {
    console.error('get audit logs failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Audit-Logs'
    });
  }
});

// POST /api/patients/:id/diagnoses - Diagnose hinzufügen
router.post('/:id/diagnoses', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = addDiagnosisSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const diagnoses = (patient.diagnoses as any[]) || [];
    const newDiagnosis = {
      id: `diagnosis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: parsed.data.text,
      created_at: new Date().toISOString(),
      is_deleted: false,
      deleted_at: null
    };

    diagnoses.push(newDiagnosis);

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { diagnoses }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'add',
        'diagnosis',
        newDiagnosis.id,
        'Diagnose',
        `Diagnose hinzugefügt`,
        user.shortName || user.displayName
      )
    );

    return res.status(201).json({
      status: 'ok',
      diagnosis: newDiagnosis
    });
  } catch (error) {
    console.error('add diagnosis failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Hinzufügen der Diagnose'
    });
  }
});

// PATCH /api/patients/:id/diagnoses/:diagnosisId - Diagnose bearbeiten
router.patch('/:id/diagnoses/:diagnosisId', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateDiagnosisSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const diagnoses = (patient.diagnoses as any[]) || [];
    const diagnosisIndex = diagnoses.findIndex(d => d.id === req.params.diagnosisId);

    if (diagnosisIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Diagnose nicht gefunden'
      });
    }

    const oldDiagnosis = diagnoses[diagnosisIndex];
    const { reason, ...updateFields } = parsed.data;
    const changes: Record<string, { old?: string; new?: string }> = {};
    
    if (oldDiagnosis.text !== updateFields.text) {
      changes.text = { old: oldDiagnosis.text, new: updateFields.text };
    }

    diagnoses[diagnosisIndex] = {
      ...oldDiagnosis,
      ...updateFields
    };

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { diagnoses }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'update',
        'diagnosis',
        oldDiagnosis.id,
        'Diagnose',
        `Diagnose bearbeitet`,
        user.shortName || user.displayName,
        changes,
        reason
      )
    );

    return res.json({
      status: 'ok',
      diagnosis: diagnoses[diagnosisIndex]
    });
  } catch (error) {
    console.error('update diagnosis failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Bearbeiten der Diagnose'
    });
  }
});

// DELETE /api/patients/:id/diagnoses/:diagnosisId - Diagnose Soft Delete
router.delete('/:id/diagnoses/:diagnosisId', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = deleteDiagnosisSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const diagnoses = (patient.diagnoses as any[]) || [];
    const diagnosisIndex = diagnoses.findIndex(d => d.id === req.params.diagnosisId);

    if (diagnosisIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Diagnose nicht gefunden'
      });
    }

    const diagnosis = diagnoses[diagnosisIndex];
    diagnoses[diagnosisIndex] = {
      ...diagnosis,
      is_deleted: true,
      deleted_at: new Date().toISOString()
    };

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { diagnoses }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'remove',
        'diagnosis',
        diagnosis.id,
        'Diagnose',
        `Diagnose entfernt`,
        user.shortName || user.displayName,
        undefined,
        parsed.data.reason
      )
    );

    return res.json({
      status: 'ok',
      message: 'Diagnose gelöscht'
    });
  } catch (error) {
    console.error('delete diagnosis failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Löschen der Diagnose'
    });
  }
});

// POST /api/patients/:id/findings - Befund hinzufügen
router.post('/:id/findings', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = addFindingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const findings = (patient.findings as any[]) || [];
    const newFinding = {
      id: `finding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: parsed.data.text,
      created_at: new Date().toISOString(),
      is_deleted: false,
      deleted_at: null
    };

    findings.push(newFinding);

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { findings }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'add',
        'finding',
        newFinding.id,
        'Befund',
        `Befund hinzugefügt`,
        user.shortName || user.displayName
      )
    );

    return res.status(201).json({
      status: 'ok',
      finding: newFinding
    });
  } catch (error) {
    console.error('add finding failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Hinzufügen des Befunds'
    });
  }
});

// PATCH /api/patients/:id/findings/:findingId - Befund bearbeiten
router.patch('/:id/findings/:findingId', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateFindingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const findings = (patient.findings as any[]) || [];
    const findingIndex = findings.findIndex(f => f.id === req.params.findingId);

    if (findingIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Befund nicht gefunden'
      });
    }

    const oldFinding = findings[findingIndex];
    const { reason, ...updateFields } = parsed.data;
    const changes: Record<string, { old?: string; new?: string }> = {};
    
    if (oldFinding.text !== updateFields.text) {
      changes.text = { old: oldFinding.text, new: updateFields.text };
    }

    findings[findingIndex] = {
      ...oldFinding,
      ...updateFields
    };

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { findings }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'update',
        'finding',
        oldFinding.id,
        'Befund',
        `Befund bearbeitet`,
        user.shortName || user.displayName,
        changes,
        reason
      )
    );

    return res.json({
      status: 'ok',
      finding: findings[findingIndex]
    });
  } catch (error) {
    console.error('update finding failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Bearbeiten des Befunds'
    });
  }
});

// DELETE /api/patients/:id/findings/:findingId - Befund Soft Delete
router.delete('/:id/findings/:findingId', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = deleteFindingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    const findings = (patient.findings as any[]) || [];
    const findingIndex = findings.findIndex(f => f.id === req.params.findingId);

    if (findingIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Befund nicht gefunden'
      });
    }

    const finding = findings[findingIndex];
    findings[findingIndex] = {
      ...finding,
      is_deleted: true,
      deleted_at: new Date().toISOString()
    };

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { findings }
    });

    // Audit-Log erstellen
    await addAuditLogToPatient(
      req.params.id,
      createAuditLog(
        'remove',
        'finding',
        finding.id,
        'Befund',
        `Befund entfernt`,
        user.shortName || user.displayName,
        undefined,
        parsed.data.reason
      )
    );

    return res.json({
      status: 'ok',
      message: 'Befund gelöscht'
    });
  } catch (error) {
    console.error('delete finding failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Löschen des Befunds'
    });
  }
});

export default router;

