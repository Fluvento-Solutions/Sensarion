import { execa } from 'execa';
import { commandExists } from './os.js';

/**
 * Installiert Ollama
 */
export async function installOllama() {
  console.log('📦 Installiere Ollama...');

  try {
    // Verwende offizielles Install-Script
    const { stdout } = await execa('curl', ['-fsSL', 'https://ollama.ai/install.sh'], {
      encoding: 'utf-8'
    });

    // Führe Install-Script aus
    await execa('sh', ['-c', stdout], { stdio: 'inherit', shell: true });

    console.log('✅ Ollama installiert');
    return true;
  } catch (error) {
    console.error('❌ Fehler bei Ollama-Installation:', error.message);
    throw error;
  }
}

/**
 * Startet Ollama Service
 */
export async function startOllama() {
  try {
    // Prüfe ob Ollama bereits läuft
    if (await isOllamaRunning()) {
      console.log('✅ Ollama läuft bereits');
      return true;
    }

    // Starte Ollama Service
    await execa('sudo', ['systemctl', 'start', 'ollama'], { stdio: 'inherit', reject: false });
    await execa('sudo', ['systemctl', 'enable', 'ollama'], { stdio: 'inherit', reject: false });

    // Warte kurz bis Service gestartet ist
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('✅ Ollama Service gestartet');
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Starten von Ollama:', error.message);
    throw error;
  }
}

/**
 * Prüft ob Ollama läuft
 */
export async function isOllamaRunning() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Listet verfügbare Modelle auf
 */
export async function listModels() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.models || [];
  } catch {
    return [];
  }
}

/**
 * Installiert ein Modell
 */
export async function installModel(modelName) {
  console.log(`📦 Installiere Modell ${modelName}...`);

  try {
    const response = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    });

    if (!response.ok) {
      throw new Error(`Fehler beim Installieren: ${response.statusText}`);
    }

    // Warte auf Completion (Streaming)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.status === 'success') {
            console.log(`✅ Modell ${modelName} installiert`);
            return true;
          }
        } catch {
          // Ignore
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`❌ Fehler beim Installieren des Modells ${modelName}:`, error.message);
    throw error;
  }
}

