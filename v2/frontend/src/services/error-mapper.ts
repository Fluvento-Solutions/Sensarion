/**
 * RFC 7807 Error Mapper
 * 
 * Konvertiert RFC 7807 Problem Details zu User-friendly Errors
 */

export interface RFC7807Error {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

export interface UserFriendlyError {
  message: string;
  code: string;
  status: number;
  context?: {
    instance?: string;
    timestamp?: string;
  };
}

/**
 * Message-Map für bekannte Fehler-Typen
 */
const messageMap: Record<string, string> = {
  'https://sensarion.local/errors/patient-not-found': 'Patient nicht gefunden',
  'https://sensarion.local/errors/unauthorized': 'Bitte melden Sie sich an',
  'https://sensarion.local/errors/forbidden': 'Keine Berechtigung',
  'https://sensarion.local/errors/payment-required': 'Modul nicht abonniert',
  'https://sensarion.local/errors/bad-request': 'Ungültige Anfrage',
  'https://sensarion.local/errors/not-found': 'Ressource nicht gefunden',
  'https://sensarion.local/errors/internal-server-error': 'Ein Fehler ist aufgetreten'
};

/**
 * Mappt RFC 7807 Error zu User-friendly Error
 */
export function mapRFC7807Error(error: RFC7807Error): UserFriendlyError {
  return {
    message: messageMap[error.type] || error.detail || error.title,
    code: error.type,
    status: error.status,
    context: {
      instance: error.instance,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Prüft ob Error ein RFC 7807 Error ist
 */
export function isRFC7807Error(error: unknown): error is RFC7807Error {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'title' in error &&
    'status' in error &&
    'detail' in error
  );
}

