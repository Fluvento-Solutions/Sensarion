import { ProblemDetails } from './ProblemDetails';

/**
 * Payment Required Error (402)
 * 
 * Wird geworfen wenn Tenant kein aktives Modul hat
 */
export function paymentRequired(detail: string, instance?: string): ProblemDetails {
  return new ProblemDetails(
    402,
    'https://sensarion.local/errors/payment-required',
    'Payment Required',
    detail,
    instance
  );
}

