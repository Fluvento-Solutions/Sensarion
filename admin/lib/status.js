import { readFile, pathExists } from 'fs-extra';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');

/**
 * Prüft ob bereits eine Installation vorhanden ist
 */
export async function checkInstallationStatus() {
  const status = {
    hasEnvFile: false,
    hasDatabase: false,
    hasPostgres: false,
    hasOllama: false,
    installationComplete: false
  };

  // Prüfe .env Datei
  const envPath = join(ROOT_DIR, 'server/.env');
  status.hasEnvFile = await pathExists(envPath);

  if (status.hasEnvFile) {
    try {
      const envContent = await readFile(envPath, 'utf-8');
      
      // Prüfe ob DATABASE_URL gesetzt ist
      if (envContent.includes('DATABASE_URL=')) {
        status.hasDatabase = true;
      }

      // Prüfe ob OLLAMA_BASE_URL gesetzt ist
      if (envContent.includes('OLLAMA_BASE_URL=')) {
        status.hasOllama = true;
      }

      // Prüfe ob installation_complete gesetzt ist
      if (envContent.includes('INSTALLATION_COMPLETE=true')) {
        status.installationComplete = true;
      }
    } catch (error) {
      // Ignore
    }
  }

  // Prüfe ob PostgreSQL läuft
  try {
    const { execa } = await import('execa');
    await execa('pg_isready', [], { reject: false });
    status.hasPostgres = true;
  } catch {
    // PostgreSQL nicht verfügbar
  }

  // Prüfe ob Ollama läuft
  try {
    const { execa } = await import('execa');
    const response = await fetch('http://localhost:11434/api/tags', { 
      signal: AbortSignal.timeout(2000) 
    });
    if (response.ok) {
      status.hasOllama = true;
    }
  } catch {
    // Ollama nicht verfügbar
  }

  return status;
}

/**
 * Bestimmt die Aktion basierend auf dem Status
 */
export function determineAction(status) {
  if (status.installationComplete) {
    return {
      type: 'configured',
      options: ['Ändern', 'Deinstallieren']
    };
  }

  if (status.hasEnvFile || status.hasDatabase || status.hasPostgres || status.hasOllama) {
    return {
      type: 'partial',
      options: ['Behalten', 'Überschreiben']
    };
  }

  return {
    type: 'fresh',
    options: ['Installieren']
  };
}

