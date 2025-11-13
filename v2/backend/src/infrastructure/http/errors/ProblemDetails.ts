/**
 * RFC 7807 Problem Details for HTTP APIs
 * 
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export class ProblemDetails extends Error {
  constructor(
    public readonly status: number,
    public readonly type: string,
    public readonly title: string,
    public readonly detail: string,
    public readonly instance?: string
  ) {
    super(detail);
    this.name = 'ProblemDetails';
    Object.setPrototypeOf(this, ProblemDetails.prototype);
  }
  
  toJSON(): RFC7807Error {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      ...(this.instance && { instance: this.instance })
    };
  }
}

export interface RFC7807Error {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

/**
 * Factory-Funktionen für häufige Fehler
 */
export const ProblemDetailsFactory = {
  badRequest: (detail: string, instance?: string): ProblemDetails =>
    new ProblemDetails(
      400,
      'https://sensarion.local/errors/bad-request',
      'Bad Request',
      detail,
      instance
    ),
  
  unauthorized: (detail: string = 'Authentication required', instance?: string): ProblemDetails =>
    new ProblemDetails(
      401,
      'https://sensarion.local/errors/unauthorized',
      'Unauthorized',
      detail,
      instance
    ),
  
  forbidden: (detail: string = 'Insufficient permissions', instance?: string): ProblemDetails =>
    new ProblemDetails(
      403,
      'https://sensarion.local/errors/forbidden',
      'Forbidden',
      detail,
      instance
    ),
  
  notFound: (resource: string, id: string, instance?: string): ProblemDetails =>
    new ProblemDetails(
      404,
      'https://sensarion.local/errors/not-found',
      'Not Found',
      `${resource} ${id} not found`,
      instance
    ),
  
  conflict: (detail: string, instance?: string): ProblemDetails =>
    new ProblemDetails(
      409,
      'https://sensarion.local/errors/conflict',
      'Conflict',
      detail,
      instance
    ),
  
  preconditionFailed: (detail: string, instance?: string): ProblemDetails =>
    new ProblemDetails(
      412,
      'https://sensarion.local/errors/precondition-failed',
      'Precondition Failed',
      detail,
      instance
    ),
  
  internalServerError: (detail: string = 'An unexpected error occurred', instance?: string): ProblemDetails =>
    new ProblemDetails(
      500,
      'https://sensarion.local/errors/internal-server-error',
      'Internal Server Error',
      detail,
      instance
    ),
  
  serviceUnavailable: (service: string, detail?: string, instance?: string): ProblemDetails =>
    new ProblemDetails(
      503,
      'https://sensarion.local/errors/service-unavailable',
      'Service Unavailable',
      detail || `${service} is currently unavailable`,
      instance
    ),
  
  paymentRequired: (detail: string, instance?: string): ProblemDetails =>
    new ProblemDetails(
      402,
      'https://sensarion.local/errors/payment-required',
      'Payment Required',
      detail,
      instance
    )
};

