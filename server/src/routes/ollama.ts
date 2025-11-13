import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

import { generateWithOllama, generateWithOllamaStream } from '../services/ollama';
import { prisma } from '../db/client';
import { env } from '../config/env';

const router = Router();

// Helper: Extract user from token (aus patients.ts kopiert)
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
  (req as any).authUser = user;
  next();
};

const requestSchema = z.object({
  prompt: z.string().min(1, 'Prompt required'),
  model: z.string().default('gemma3:12b'),
  context: z.string().optional(),
  options: z.record(z.unknown()).optional()
});

router.post('/generate', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const result = await generateWithOllama(parsed.data);
    res.json({ status: 'ok', result });
  } catch (error) {
    res.status(502).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown Ollama error'
    });
  }
});

// POST /api/ollama/improve-text - Text mit KI verbessern
const improveTextSchema = z.object({
  text: z.string().min(1, 'Text required'),
  systemPrompt: z.string().optional()
});

router.post('/improve-text', requireAuth, async (req, res) => {
  const parsed = improveTextSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const systemPrompt = parsed.data.systemPrompt || 'Du bist eine medizinische Schreibkraft mit Expertise in medizinischer Terminologie und ICD-Codierung. Deine Aufgabe ist es, medizinische Texte zu verbessern. Du korrigierst Rechtschreibfehler, verbesserst die Ausdrucksweise in professionelle, fachlich korrekte medizinische Form und sorgst für einen sauberen Stil. Du formulierst medizinische Begriffe korrekt und fügst bei Diagnosen die entsprechenden ICD-Codes in Klammern hinzu (z.B. "Diabetes mellitus Typ 2 (E11.9)"). WICHTIG: Du änderst KEINE Fakten, Daten, Zahlen, Namen oder medizinischen Informationen. Du gibst nur den verbesserten Text zurück, ohne zusätzliche Erklärungen oder Kommentare.';
    
    const prompt = `Verbessere folgenden Text:\n\n${parsed.data.text}`;

    // Streaming-Modus
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await generateWithOllamaStream({
      model: 'gemma3:12b',
      prompt,
      systemPrompt,
      options: { temperature: 0.1 }
    });

    const reader = stream.getReader();
    const encoder = new TextEncoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          res.write(encoder.encode('data: [DONE]\n\n'));
          res.end();
          break;
        }

        res.write(encoder.encode(`data: ${JSON.stringify({ chunk: value })}\n\n`));
      }
    } catch (error) {
      res.write(encoder.encode(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Streaming error' })}\n\n`));
      res.end();
    }
  } catch (error) {
    res.status(502).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Fehler beim Verbessern des Textes'
    });
  }
});

// POST /api/ollama/review-patient - Patient mit KI überprüfen
const reviewPatientSchema = z.object({
  patientId: z.string().min(1, 'Patient ID required')
});

router.post('/review-patient', requireAuth, async (req, res) => {
  const parsed = reviewPatientSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    // Lade alle Patientendaten
    const patient = await prisma.patient.findUnique({
      where: { id: parsed.data.patientId },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        encounters: {
          orderBy: { date: 'desc' },
          take: 10
        }
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient nicht gefunden'
      });
    }

    // Strukturiere Patientendaten für den Prompt
    const patientData = {
      basis: {
        name: patient.name,
        geburtsdatum: patient.birthDate.toISOString().split('T')[0],
        geschlecht: patient.gender || 'Nicht angegeben',
        alter: Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
      },
      vitalwerte: {
        aktuell: patient.vitalsLatest,
        historie: (patient.vitalsHistory as any[])?.slice(-10) || []
      },
      allergien: (patient.allergies as any[])?.filter((a: any) => !a.is_deleted && !a.deleted_at) || [],
      medikationen: (patient.medications as any[])?.filter((m: any) => !m.is_deleted && !m.deleted_at) || [],
      notizen: patient.notes.map(n => ({
        datum: n.createdAt.toISOString(),
        text: n.text
      })),
      kontakte: patient.encounters.map(e => ({
        datum: e.date.toISOString().split('T')[0],
        grund: e.reason,
        ort: e.location,
        zusammenfassung: e.summary
      }))
    };

    const systemPrompt = 'Du bist ein medizinischer Assistent mit Expertise in der Patientenanalyse. Deine Aufgabe ist es, Patientendaten objektiv und präzise zu analysieren. Du identifizierst Auffälligkeiten, Anomalien, fehlende kritische Werte und potenzielle Gefahren. Antworte strukturiert, sachlich und präzise auf Deutsch. Verwende KEINE Spekulationen oder unsichere Aussagen.';

    const prompt = `Analysiere folgende Patientendaten und identifiziere:
1) Auffälligkeiten
2) Anomalien
3) Fehlende dringend benötigte Werte
4) Ob der Patient aufgrund der aktuellen Werte in Gefahr ist

Patientendaten:
${JSON.stringify(patientData, null, 2)}`;

    // Streaming-Modus
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await generateWithOllamaStream({
      model: 'gemma3:12b',
      prompt,
      systemPrompt,
      options: { temperature: 0.1 }
    });

    const reader = stream.getReader();
    const encoder = new TextEncoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          res.write(encoder.encode('data: [DONE]\n\n'));
          res.end();
          break;
        }

        res.write(encoder.encode(`data: ${JSON.stringify({ chunk: value })}\n\n`));
      }
    } catch (error) {
      res.write(encoder.encode(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Streaming error' })}\n\n`));
      res.end();
    }
  } catch (error) {
    res.status(502).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Fehler bei der KI-Überprüfung'
    });
  }
});

// POST /api/ollama/review-patient-data - Patientendaten mit KI überprüfen (vor Erstellung)
const reviewPatientDataSchema = z.object({
  patientData: z.object({
    givenNames: z.string(),
    familyName: z.string(),
    birthDate: z.string(),
    gender: z.string().optional(),
    tags: z.string().optional(),
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
    anamnesis: z.object({
      reason: z.string().optional(),
      complaints: z.string().optional(),
      previousIllnesses: z.string().optional(),
      medications: z.array(z.any()).optional(),
      allergies: z.array(z.any()).optional()
    }).optional(),
    vitals: z.object({
      bp_systolic: z.number().optional(),
      bp_diastolic: z.number().optional(),
      hr: z.number().optional(),
      temperature: z.number().optional(),
      spo2: z.number().optional(),
      glucose: z.number().optional(),
      weight: z.number().optional(),
      height: z.number().optional(),
      pain_scale: z.number().optional()
    }).optional()
  })
});

router.post('/review-patient-data', requireAuth, async (req, res) => {
  const parsed = reviewPatientDataSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const { patientData } = parsed.data;
    
    // Berechne Alter
    const birthDate = new Date(patientData.birthDate);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
    
    // Strukturiere Patientendaten für den Prompt
    const structuredData = {
      basis: {
        name: {
          given: patientData.givenNames.split(',').map(n => n.trim()),
          family: patientData.familyName
        },
        geburtsdatum: patientData.birthDate,
        alter: age,
        geschlecht: patientData.gender || 'Nicht angegeben',
        tags: patientData.tags ? patientData.tags.split(',').map(t => t.trim()) : []
      },
      adresse: patientData.address || null,
      kontakt: patientData.contact || null,
      versicherung: patientData.insurance || null,
      anamnese: {
        grund: patientData.anamnesis?.reason || 'Nicht angegeben',
        beschwerden: patientData.anamnesis?.complaints || 'Keine',
        vorerkrankungen: patientData.anamnesis?.previousIllnesses || 'Keine',
        allergien: patientData.anamnesis?.allergies || [],
        medikationen: patientData.anamnesis?.medications || []
      },
      vitalwerte: patientData.vitals || null
    };

    const systemPrompt = 'Du bist ein medizinischer Assistent mit Expertise in der Patientenanalyse. Deine Aufgabe ist es, neu erfasste Patientendaten objektiv und präzise zu analysieren. Du identifizierst: 1) Fehlende kritische Informationen, 2) Empfohlene weitere Fragen oder Untersuchungen, 3) Auffälligkeiten in den erfassten Daten, 4) Potenzielle Risiken oder Warnsignale. Antworte strukturiert, sachlich und präzise auf Deutsch. Verwende KEINE Spekulationen oder unsichere Aussagen.';

    const prompt = `Analysiere folgende neu erfasste Patientendaten und gib Empfehlungen:
1) Welche kritischen Informationen fehlen noch?
2) Welche weiteren Fragen sollten gestellt werden?
3) Welche Untersuchungen sollten durchgeführt werden?
4) Gibt es Auffälligkeiten oder Warnsignale in den erfassten Daten?

Patientendaten:
${JSON.stringify(structuredData, null, 2)}`;

    // Streaming-Modus
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await generateWithOllamaStream({
      model: 'gemma3:12b',
      prompt,
      systemPrompt,
      options: { temperature: 0.1 }
    });

    const reader = stream.getReader();
    const encoder = new TextEncoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          res.write(encoder.encode('data: [DONE]\n\n'));
          res.end();
          break;
        }

        res.write(encoder.encode(`data: ${JSON.stringify({ chunk: value })}\n\n`));
      }
    } catch (error) {
      res.write(encoder.encode(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Streaming error' })}\n\n`));
      res.end();
    }
  } catch (error) {
    res.status(502).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Fehler bei der KI-Überprüfung'
    });
  }
});

export default router;

