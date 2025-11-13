import { execa } from 'execa';
import { getPackageManager, commandExists } from './os.js';

/**
 * Installiert PostgreSQL
 */
export async function installPostgreSQL(packageManager) {
  if (!packageManager) {
    throw new Error('Kein Package Manager gefunden');
  }

  console.log(`📦 Installiere PostgreSQL mit ${packageManager}...`);

  try {
    if (packageManager === 'apt') {
      await execa('sudo', ['apt-get', 'update'], { stdio: 'inherit' });
      await execa('sudo', ['apt-get', 'install', '-y', 'postgresql', 'postgresql-contrib'], { stdio: 'inherit' });
    } else if (packageManager === 'yum' || packageManager === 'dnf') {
      const cmd = packageManager === 'dnf' ? 'dnf' : 'yum';
      await execa('sudo', [cmd, 'install', '-y', 'postgresql-server', 'postgresql-contrib'], { stdio: 'inherit' });
      // Initialisiere Datenbank
      await execa('sudo', ['postgresql-setup', '--initdb'], { stdio: 'inherit' });
    } else if (packageManager === 'brew') {
      await execa('brew', ['install', 'postgresql@15'], { stdio: 'inherit' });
      await execa('brew', ['services', 'start', 'postgresql@15'], { stdio: 'inherit' });
    } else {
      throw new Error(`Package Manager ${packageManager} wird nicht unterstützt`);
    }

    console.log('✅ PostgreSQL installiert');
    return true;
  } catch (error) {
    console.error('❌ Fehler bei PostgreSQL-Installation:', error.message);
    throw error;
  }
}

/**
 * Startet PostgreSQL Service
 */
export async function startPostgreSQL(packageManager) {
  try {
    if (packageManager === 'apt' || packageManager === 'yum' || packageManager === 'dnf') {
      await execa('sudo', ['systemctl', 'start', 'postgresql'], { stdio: 'inherit' });
      await execa('sudo', ['systemctl', 'enable', 'postgresql'], { stdio: 'inherit' });
    } else if (packageManager === 'brew') {
      await execa('brew', ['services', 'start', 'postgresql@15'], { stdio: 'inherit' });
    }

    // Warte kurz bis Service gestartet ist
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ PostgreSQL Service gestartet');
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Starten von PostgreSQL:', error.message);
    throw error;
  }
}

/**
 * Prüft ob PostgreSQL läuft
 */
export async function isPostgreSQLRunning() {
  try {
    await execa('pg_isready', [], { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Erstellt Datenbank-User und Datenbank
 */
export async function createDatabaseAndUser(dbName, dbUser, dbPassword) {
  try {
    console.log(`📊 Erstelle Datenbank ${dbName} und User ${dbUser}...`);

    // Erstelle User
    await execa('sudo', ['-u', 'postgres', 'psql', '-c', `CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}';`], {
      stdio: 'inherit',
      reject: false
    });

    // Erstelle Datenbank
    await execa('sudo', ['-u', 'postgres', 'psql', '-c', `CREATE DATABASE ${dbName} OWNER ${dbUser};`], {
      stdio: 'inherit',
      reject: false
    });

    // Gewähre Berechtigungen
    await execa('sudo', ['-u', 'postgres', 'psql', '-d', dbName, '-c', `GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};`], {
      stdio: 'inherit',
      reject: false
    });

    console.log('✅ Datenbank und User erstellt');
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Datenbank:', error.message);
    throw error;
  }
}

/**
 * Generiert DATABASE_URL
 */
export function generateDatabaseUrl(dbName, dbUser, dbPassword, host = 'localhost', port = 5432) {
  return `postgresql://${dbUser}:${dbPassword}@${host}:${port}/${dbName}?schema=public`;
}

