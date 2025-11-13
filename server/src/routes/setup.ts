import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import bcrypt from 'bcryptjs';

const router = Router();

// GET /api/setup/status - Prüft Setup-Status
router.get('/status', async (req, res) => {
  try {
    const config = await prisma.systemConfig.findFirst();
    
    return res.json({
      status: 'ok',
      installationComplete: config?.installationComplete || false,
      hasConfig: !!config
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Prüfen des Setup-Status'
    });
  }
});

// POST /api/setup/init - Initialisiert System (erstellt Praxis + Admin-User)
const initSchema = z.object({
  practiceName: z.string().min(1, 'Praxis-Name erforderlich'),
  practiceCode: z.string().min(1, 'Praxis-Code erforderlich'),
  adminEmail: z.string().email('Ungültige E-Mail-Adresse'),
  adminPassword: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
  adminDisplayName: z.string().min(1, 'Anzeigename erforderlich'),
  adminShortName: z.string().optional()
});

router.post('/init', async (req, res) => {
  try {
    const parsed = initSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    // Prüfe ob bereits initialisiert
    const existingConfig = await prisma.systemConfig.findFirst();
    if (existingConfig?.installationComplete) {
      return res.status(409).json({
        status: 'error',
        message: 'System bereits initialisiert'
      });
    }

    // Erstelle Praxis
    const practice = await prisma.practice.create({
      data: {
        name: parsed.data.practiceName,
        code: parsed.data.practiceCode
      }
    });

    // Erstelle Admin-User
    const passwordHash = await bcrypt.hash(parsed.data.adminPassword, 10);
    const adminUser = await prisma.user.create({
      data: {
        email: parsed.data.adminEmail,
        passwordHash,
        displayName: parsed.data.adminDisplayName,
        shortName: parsed.data.adminShortName || parsed.data.adminDisplayName.split(' ')[0],
        practiceId: practice.id,
        isPracticeAdmin: true
      }
    });

    // Setze installation_complete
    if (existingConfig) {
      await prisma.systemConfig.update({
        where: { id: existingConfig.id },
        data: { installationComplete: true }
      });
    } else {
      await prisma.systemConfig.create({
        data: { installationComplete: true }
      });
    }

    return res.json({
      status: 'ok',
      message: 'System erfolgreich initialisiert',
      practice: {
        id: practice.id,
        name: practice.name,
        code: practice.code
      },
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        displayName: adminUser.displayName
      }
    });
  } catch (error) {
    console.error('setup init failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler bei der Initialisierung'
    });
  }
});

// GET /api/setup/test/postgres - Testet PostgreSQL-Verbindung
router.get('/test/postgres', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'ok',
      message: 'PostgreSQL-Verbindung erfolgreich'
    });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      message: 'PostgreSQL-Verbindung fehlgeschlagen'
    });
  }
});

// GET /api/setup/test/ollama - Testet Ollama-Verbindung
router.get('/test/ollama', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000)
    });
    
    if (response.ok) {
      return res.json({
        status: 'ok',
        message: 'Ollama-Verbindung erfolgreich'
      });
    } else {
      return res.status(503).json({
        status: 'error',
        message: 'Ollama nicht erreichbar'
      });
    }
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      message: 'Ollama-Verbindung fehlgeschlagen'
    });
  }
});

// GET /api/setup/models - Listet verfügbare Ollama-Modelle
router.get('/models', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    
    if (!response.ok) {
      return res.status(503).json({
        status: 'error',
        message: 'Ollama nicht erreichbar'
      });
    }

    const data = await response.json();
    return res.json({
      status: 'ok',
      models: data.models || []
    });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      message: 'Fehler beim Abrufen der Modelle'
    });
  }
});

// POST /api/setup/whitelabel - Aktualisiert Whitelabel-Einstellungen
const whitelabelSchema = z.object({
  practiceId: z.string().min(1),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

router.post('/whitelabel', async (req, res) => {
  try {
    const parsed = whitelabelSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const practice = await prisma.practice.update({
      where: { id: parsed.data.practiceId },
      data: {
        logoUrl: parsed.data.logoUrl,
        primaryColor: parsed.data.primaryColor
      }
    });

    return res.json({
      status: 'ok',
      practice: {
        id: practice.id,
        name: practice.name,
        logoUrl: practice.logoUrl,
        primaryColor: practice.primaryColor
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Aktualisieren der Whitelabel-Einstellungen'
    });
  }
});

export default router;

