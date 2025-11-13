import { readFile, writeFile, pathExists } from 'fs-extra';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');

/**
 * Generiert ein sicheres Session-Secret
 */
export function generateSessionSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Liest die .env Datei
 */
export async function readEnvFile() {
  const envPath = join(ROOT_DIR, 'server/.env');
  
  if (!(await pathExists(envPath))) {
    return {};
  }

  const content = await readFile(envPath, 'utf-8');
  const env = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^"|"$/g, '');
      env[key.trim()] = value;
    }
  }

  return env;
}

/**
 * Schreibt die .env Datei
 */
export async function writeEnvFile(env) {
  const envPath = join(ROOT_DIR, 'server/.env');
  const templatePath = join(__dirname, '../templates/.env.template');

  let content = '';
  
  // Wenn Template existiert, verwende es als Basis
  if (await pathExists(templatePath)) {
    content = await readFile(templatePath, 'utf-8');
  }

  // Überschreibe mit neuen Werten
  const lines = content.split('\n');
  const newLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      newLines.push(line);
      continue;
    }

    const [key] = trimmed.split('=');
    if (key && env[key.trim()]) {
      const value = env[key.trim()];
      newLines.push(`${key.trim()}=${value}`);
      delete env[key.trim()];
    } else {
      newLines.push(line);
    }
  }

  // Füge neue Variablen hinzu
  for (const [key, value] of Object.entries(env)) {
    newLines.push(`${key}=${value}`);
  }

  await writeFile(envPath, newLines.join('\n') + '\n', 'utf-8');
}

/**
 * Setzt eine Umgebungsvariable
 */
export async function setEnvVariable(key, value) {
  const env = await readEnvFile();
  env[key] = value;
  await writeEnvFile(env);
}

/**
 * Setzt installation_complete Flag
 */
export async function setInstallationComplete(complete = true) {
  await setEnvVariable('INSTALLATION_COMPLETE', complete ? 'true' : 'false');
}

