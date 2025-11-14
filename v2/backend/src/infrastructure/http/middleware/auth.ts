import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { ProblemDetailsFactory } from '../errors/ProblemDetails';

/**
 * Authentifizierter Benutzer (aus JWT)
 */
export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
}

/**
 * Erweitert FastifyRequest mit AuthenticatedUser
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

/**
 * Middleware: Prüft JWT Token und setzt request.user
 * 
 * @throws ProblemDetails (401) wenn Token fehlt oder ungültig
 */
export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  
  if (!authHeader) {
    console.warn('[Auth] No Authorization header in request:', {
      url: request.url,
      method: request.method,
      headers: Object.keys(request.headers)
    });
    throw ProblemDetailsFactory.unauthorized('Authorization header required');
  }
  
  const [scheme, token] = authHeader.split(' ');
  
  if (scheme !== 'Bearer' || !token) {
    console.warn('[Auth] Invalid authorization format:', {
      url: request.url,
      scheme,
      hasToken: !!token
    });
    throw ProblemDetailsFactory.unauthorized('Invalid authorization format. Expected: Bearer <token>');
  }
  
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      tenantId: string;
      email: string;
      roles: string[];
    };
    
    request.user = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      roles: payload.roles
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ProblemDetailsFactory.unauthorized('Token expired');
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      throw ProblemDetailsFactory.unauthorized('Invalid token');
    }
    
    throw ProblemDetailsFactory.unauthorized('Token verification failed');
  }
}

