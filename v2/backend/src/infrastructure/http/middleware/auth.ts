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
  
  // Decode token without verification to see what's inside (for debugging)
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (decoded) {
      console.log('[Auth] Token decoded (not verified):', {
        header: decoded.header,
        payload: decoded.payload,
        expired: decoded.payload && typeof decoded.payload === 'object' && 'exp' in decoded.payload
          ? new Date((decoded.payload as any).exp * 1000) < new Date()
          : 'unknown'
      });
    }
  } catch (decodeError) {
    console.warn('[Auth] Could not decode token:', decodeError);
  }
  
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      tenantId: string;
      email: string;
      roles: string[];
    };
    
    console.log('[Auth] Token verified successfully:', {
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email
    });
    
    request.user = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      roles: payload.roles
    };
  } catch (error) {
    console.error('[Auth] Token verification failed:', {
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.constructor.name : typeof error,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
      jwtSecretLength: env.JWT_SECRET.length
    });
    
    if (error instanceof jwt.TokenExpiredError) {
      console.warn('[Auth] Token expired at:', error.expiredAt);
      throw ProblemDetailsFactory.unauthorized('Token expired');
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      console.warn('[Auth] JWT Error:', error.message);
      throw ProblemDetailsFactory.unauthorized(`Invalid token: ${error.message}`);
    }
    
    throw ProblemDetailsFactory.unauthorized('Token verification failed');
  }
}

