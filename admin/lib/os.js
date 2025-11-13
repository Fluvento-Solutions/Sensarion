import { execa } from 'execa';
import os from 'os';

/**
 * Erkennt das Betriebssystem
 */
export function detectOS() {
  const platform = os.platform();
  const release = os.release();

  if (platform === 'linux') {
    // Versuche Distribution zu erkennen
    return {
      platform: 'linux',
      distro: null, // Wird später erkannt
      release
    };
  } else if (platform === 'darwin') {
    return {
      platform: 'macos',
      distro: 'macos',
      release
    };
  } else if (platform === 'win32') {
    return {
      platform: 'windows',
      distro: 'windows',
      release
    };
  }

  return {
    platform: 'unknown',
    distro: null,
    release
  };
}

/**
 * Erkennt die Linux-Distribution
 */
export async function detectLinuxDistro() {
  try {
    // Prüfe /etc/os-release
    const { stdout } = await execa('cat', ['/etc/os-release']);
    const lines = stdout.split('\n');
    const distro = {};

    for (const line of lines) {
      const [key, value] = line.split('=');
      if (key && value) {
        distro[key.toLowerCase()] = value.replace(/^"|"$/g, '');
      }
    }

    return distro;
  } catch (error) {
    return null;
  }
}

/**
 * Prüft ob sudo verfügbar ist
 */
export async function hasSudo() {
  try {
    await execa('sudo', ['-n', 'true'], { reject: false });
    return true;
  } catch {
    return false;
  }
}

/**
 * Prüft ob ein Befehl verfügbar ist
 */
export async function commandExists(command) {
  try {
    await execa('which', [command]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gibt den Package Manager für das System zurück
 */
export async function getPackageManager() {
  const osInfo = detectOS();

  if (osInfo.platform === 'macos') {
    if (await commandExists('brew')) {
      return 'brew';
    }
    return null;
  }

  if (osInfo.platform === 'linux') {
    const distro = await detectLinuxDistro();
    if (!distro) {
      return null;
    }

    const id = distro.id?.toLowerCase() || '';
    const idLike = distro.id_like?.toLowerCase() || '';

    if (id === 'ubuntu' || id === 'debian' || idLike.includes('ubuntu') || idLike.includes('debian')) {
      if (await commandExists('apt')) {
        return 'apt';
      }
    }

    if (id === 'fedora' || id === 'rhel' || id === 'centos' || idLike.includes('fedora') || idLike.includes('rhel')) {
      if (await commandExists('dnf')) {
        return 'dnf';
      }
      if (await commandExists('yum')) {
        return 'yum';
      }
    }

    if (id === 'arch' || idLike.includes('arch')) {
      if (await commandExists('pacman')) {
        return 'pacman';
      }
    }
  }

  return null;
}

