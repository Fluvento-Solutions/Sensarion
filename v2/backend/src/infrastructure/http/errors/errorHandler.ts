import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ProblemDetails, ProblemDetailsFactory, RFC7807Error } from './ProblemDetails';

/**
 * Global Error Handler für Fastify
 * Konvertiert alle Fehler zu RFC 7807 Problem Details
 */
export async function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // ProblemDetails werden direkt verwendet
  if (error instanceof ProblemDetails) {
    reply.status(error.status).type('application/problem+json').send(error.toJSON());
    return;
  }
  
  // Prisma-Fehler
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    if (prismaError.code === 'P2002') {
      // Unique Constraint Violation
      reply.status(409).type('application/problem+json').send(
        ProblemDetailsFactory.conflict(
          'Resource already exists',
          request.url
        ).toJSON()
      );
      return;
    }
    
    if (prismaError.code === 'P2025') {
      // Record Not Found
      reply.status(404).type('application/problem+json').send(
        ProblemDetailsFactory.notFound(
          'Resource',
          'unknown',
          request.url
        ).toJSON()
      );
      return;
    }
  }
  
  // Validation-Fehler (Zod)
  if (error.name === 'ZodError') {
    reply.status(400).type('application/problem+json').send(
      ProblemDetailsFactory.badRequest(
        'Validation failed',
        request.url
      ).toJSON()
    );
    return;
  }
  
  // JWT-Fehler
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    reply.status(401).type('application/problem+json').send(
      ProblemDetailsFactory.unauthorized(
        'Invalid or expired token',
        request.url
      ).toJSON()
    );
    return;
  }
  
  // Default: Internal Server Error
  const problem: RFC7807Error = {
    type: 'https://sensarion.local/errors/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred'
      : error.message,
    instance: request.url
  };
  
  reply.status(500).type('application/problem+json').send(problem);
}

