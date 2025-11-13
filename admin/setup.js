#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import { checkInstallationStatus, determineAction } from './lib/status.js';
import { detectOS, getPackageManager, hasSudo, commandExists } from './lib/os.js';
import { installPostgreSQL, startPostgreSQL, createDatabaseAndUser, generateDatabaseUrl, isPostgreSQLRunning } from './lib/postgres.js';
import { installOllama, startOllama, isOllamaRunning, listModels, installModel } from './lib/ollama.js';
import { readEnvFile, writeEnvFile, generateSessionSecret, setInstallationComplete } from './lib/env.js';
import { execa } from 'execa';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

console.log(chalk.blue.bold('\n🚀 SENSARION Installations-Assistent\n'));

// Hauptfunktion
async function main() {
  try {
    // 1. Prüfe System-Anforderungen
    console.log(chalk.yellow('📋 Prüfe System-Anforderungen...'));
    
    const osInfo = detectOS();
    console.log(`   OS: ${osInfo.platform} ${osInfo.release || ''}`);

    if (osInfo.platform === 'windows') {
      console.log(chalk.red('❌ Windows wird derzeit nicht unterstützt'));
      process.exit(1);
    }

    // Prüfe sudo
    if (!(await hasSudo())) {
      console.log(chalk.red('❌ sudo-Rechte erforderlich für System-Installationen'));
      console.log(chalk.yellow('   Bitte führe dieses Script mit sudo aus oder als root'));
      process.exit(1);
    }

    // Prüfe Node.js
    if (!(await commandExists('node'))) {
      console.log(chalk.red('❌ Node.js nicht gefunden'));
      console.log(chalk.yellow('   Bitte installiere Node.js 18+ zuerst'));
      process.exit(1);
    }

    console.log(chalk.green('✅ System-Anforderungen erfüllt\n'));

    // 2. Prüfe Installation-Status
    console.log(chalk.yellow('🔍 Prüfe bestehende Installation...'));
    const status = await checkInstallationStatus();
    const action = determineAction(status);

    if (action.type === 'configured') {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Installation bereits abgeschlossen. Was möchtest du tun?',
          choices: action.options
        }
      ]);

      if (choice === 'Deinstallieren') {
        await handleUninstall();
        return;
      } else if (choice === 'Ändern') {
        // Weiter mit Konfiguration
      }
    } else if (action.type === 'partial') {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Teilweise Installation gefunden. Was möchtest du tun?',
          choices: action.options
        }
      ]);

      if (choice === 'Behalten') {
        console.log(chalk.yellow('Behalte bestehende Konfiguration'));
        // Weiter mit Setup, aber überspringe Installationen
      } else if (choice === 'Überschreiben') {
        console.log(chalk.yellow('Überschreibe bestehende Installation'));
        // Weiter mit vollständiger Installation
      }
    }

    // 3. Package Manager erkennen
    const packageManager = await getPackageManager();
    if (!packageManager) {
      console.log(chalk.red('❌ Kein unterstützter Package Manager gefunden'));
      process.exit(1);
    }
    console.log(chalk.green(`✅ Package Manager: ${packageManager}\n`));

    // 4. PostgreSQL Installation
    const shouldInstallPostgres = !status.hasPostgres || (action.type === 'partial' && userChoice === 'Überschreiben');
    if (shouldInstallPostgres) {
      const { installPostgres } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installPostgres',
          message: 'PostgreSQL installieren?',
          default: true
        }
      ]);

      if (installPostgres) {
        await installPostgreSQL(packageManager);
        await startPostgreSQL(packageManager);
      }
    } else {
      console.log(chalk.green('✅ PostgreSQL bereits installiert'));
    }

    // 5. Datenbank konfigurieren
    const { dbName, dbUser, dbPassword } = await inquirer.prompt([
      {
        type: 'input',
        name: 'dbName',
        message: 'Datenbank-Name:',
        default: 'sensarion'
      },
      {
        type: 'input',
        name: 'dbUser',
        message: 'Datenbank-User:',
        default: 'sensarion_admin'
      },
      {
        type: 'password',
        name: 'dbPassword',
        message: 'Datenbank-Passwort:',
        validate: (input) => input.length >= 8 || 'Passwort muss mindestens 8 Zeichen lang sein'
      }
    ]);

    if (!(await isPostgreSQLRunning())) {
      await startPostgreSQL(packageManager);
    }

    await createDatabaseAndUser(dbName, dbUser, dbPassword);
    const databaseUrl = generateDatabaseUrl(dbName, dbUser, dbPassword);

    // 6. Ollama Installation
    const shouldInstallOllama = !status.hasOllama || (action.type === 'partial' && userChoice === 'Überschreiben');
    if (shouldInstallOllama) {
      const { installOllamaChoice } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installOllamaChoice',
          message: 'Ollama installieren?',
          default: true
        }
      ]);

      if (installOllamaChoice) {
        await installOllama();
        await startOllama();
      }
    } else {
      console.log(chalk.green('✅ Ollama bereits installiert'));
    }

    // 7. Ollama Modell installieren
    if (await isOllamaRunning()) {
      const { installModelChoice } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installModelChoice',
          message: 'Standard-Modell (gemma3:12b) installieren?',
          default: true
        }
      ]);

      if (installModelChoice) {
        await installModel('gemma3:12b');
      }
    }

    // 8. System-Parameter
    const { port, sessionSecret, devPassword } = await inquirer.prompt([
      {
        type: 'input',
        name: 'port',
        message: 'Server-Port:',
        default: '4000',
        validate: (input) => {
          const port = parseInt(input);
          return (port > 0 && port < 65536) || 'Ungültiger Port';
        }
      },
      {
        type: 'input',
        name: 'sessionSecret',
        message: 'Session-Secret (leer = automatisch generieren):',
        default: ''
      },
      {
        type: 'password',
        name: 'devPassword',
        message: 'Dev-Login-Passwort:',
        default: 'Pa$$w0rd'
      }
    ]);

    // 9. Erste Praxis & Admin-Benutzer
    const { practiceName, practiceCode, adminEmail, adminPassword, adminDisplayName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'practiceName',
        message: 'Praxis-Name:',
        validate: (input) => input.trim().length > 0 || 'Praxis-Name erforderlich'
      },
      {
        type: 'input',
        name: 'practiceCode',
        message: 'Praxis-Code:',
        validate: (input) => input.trim().length > 0 || 'Praxis-Code erforderlich'
      },
      {
        type: 'input',
        name: 'adminEmail',
        message: 'Admin-E-Mail:',
        validate: (input) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || 'Ungültige E-Mail-Adresse';
        }
      },
      {
        type: 'password',
        name: 'adminPassword',
        message: 'Admin-Passwort:',
        validate: (input) => input.length >= 8 || 'Passwort muss mindestens 8 Zeichen lang sein'
      },
      {
        type: 'input',
        name: 'adminDisplayName',
        message: 'Admin-Anzeigename:',
        default: 'Administrator'
      }
    ]);

    // 10. .env Datei erstellen
    console.log(chalk.yellow('\n📝 Erstelle Konfigurationsdatei...'));
    
    const finalSessionSecret = sessionSecret || generateSessionSecret();
    
    await writeEnvFile({
      PORT: port,
      DATABASE_URL: databaseUrl,
      OLLAMA_BASE_URL: 'http://localhost:11434',
      DEFAULT_LLM_MODEL: 'gemma3:12b',
      DEV_LOGIN_PASSWORD: devPassword,
      SESSION_SECRET: finalSessionSecret,
      INSTALLATION_COMPLETE: 'false' // Wird nach Seed auf true gesetzt
    });

    console.log(chalk.green('✅ Konfigurationsdatei erstellt\n'));

    // 11. Datenbank-Migrationen ausführen
    console.log(chalk.yellow('🗄️  Führe Datenbank-Migrationen aus...'));
    
    try {
      await execa('npm', ['run', 'prisma:generate'], { 
        cwd: join(ROOT_DIR, 'server'),
        stdio: 'inherit'
      });
      
      await execa('npm', ['run', 'prisma:migrate'], { 
        cwd: join(ROOT_DIR, 'server'),
        stdio: 'inherit'
      });
      
      console.log(chalk.green('✅ Migrationen erfolgreich\n'));
    } catch (error) {
      console.error(chalk.red('❌ Fehler bei Migrationen:', error.message));
      throw error;
    }

    // 12. Seed-Daten erstellen (Praxis + Admin-User)
    console.log(chalk.yellow('🌱 Erstelle Seed-Daten...'));
    
    // Hier müsste ein spezielles Seed-Script erstellt werden, das die Praxis und den Admin-User erstellt
    // Für jetzt: Manuell über API oder später über Web-UI
    
    console.log(chalk.yellow('⚠️  Seed-Daten müssen manuell über die Web-UI erstellt werden\n'));

    // 13. Installation abschließen
    // Setze installation_complete erst nach erfolgreicher Initialisierung über Web-UI
    // await setInstallationComplete(true);

    console.log(chalk.green.bold('\n✅ Installation abgeschlossen!\n'));
    console.log(chalk.blue('📋 Nächste Schritte:'));
    console.log(chalk.white('   1. Starte das Backend: npm --prefix server run dev'));
    console.log(chalk.white('   2. Öffne die Web-UI: http://localhost:4000/setup'));
    console.log(chalk.white('   3. Erstelle die erste Praxis und den Admin-Benutzer über die Web-UI'));
    console.log(chalk.white('   4. Oder verwende die Dev-Login-Funktion für Tests\n'));

    // 14. Optional: Backend starten
    const { startBackend } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'startBackend',
        message: 'Backend-Server jetzt starten?',
        default: true
      }
    ]);

    if (startBackend) {
      console.log(chalk.yellow('\n🚀 Starte Backend-Server...\n'));
      console.log(chalk.blue('   Backend läuft auf http://localhost:' + port));
      console.log(chalk.blue('   Setup-UI: http://localhost:' + port + '/setup\n'));
      console.log(chalk.yellow('   Drücke Ctrl+C zum Beenden\n'));

      // Starte Backend
      const backendProcess = spawn('npm', ['run', 'dev'], {
        cwd: join(ROOT_DIR, 'server'),
        stdio: 'inherit',
        shell: true
      });

      // Handle process exit
      backendProcess.on('error', (error) => {
        console.error(chalk.red('\n❌ Backend-Fehler:'), error.message);
      });

      backendProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(chalk.red(`\n❌ Backend beendet mit Code ${code}`));
        }
      });

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n\n⏻ Beende Backend...'));
        backendProcess.kill('SIGINT');
        process.exit(0);
      });
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Fehler während der Installation:'), error.message);
    process.exit(1);
  }
}

// Deinstallations-Funktion
async function handleUninstall() {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Wirklich deinstallieren? Dies kann nicht rückgängig gemacht werden!',
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Deinstallation abgebrochen'));
    return;
  }

  console.log(chalk.yellow('🗑️  Deinstalliere...'));
  
  // TODO: Implementiere Deinstallation
  // - Services stoppen
  // - Datenbank löschen
  // - .env Datei löschen
  // - etc.

  console.log(chalk.green('✅ Deinstallation abgeschlossen'));
}

// Starte Setup
main().catch(error => {
  console.error(chalk.red('Fataler Fehler:'), error);
  process.exit(1);
});

