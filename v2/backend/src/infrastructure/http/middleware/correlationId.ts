import { FastifyRequest, FastifyReply } from 'fastify';

const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Middleware: Setzt Correlation ID für Request-Tracking
 * 
 * Verwendet vorhandene Header oder generiert neue UUID
 */
export async function correlationIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const correlationId = 
    (request.headers[CORRELATION_ID_HEADER] as string) ||
    crypto.randomUUID();
  
  request.headers[CORRELATION_ID_HEADER] = correlationId;
  reply.header(CORRELATION_ID_HEADER, correlationId);
}

