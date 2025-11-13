import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import type { User } from '@/domain/entities/User';

/**
 * JWT Payload für Access Token
 */
export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
}

/**
 * JWT Service
 * 
 * Verwaltet JWT Generation und Validation
 */
export class JWTService {
  /**
   * Generiert Access Token
   */
  generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id as string,
      tenantId: user.tenantId as string,
      email: user.email.value,
      roles: [...user.roles]
    };
    
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRY
    } as jwt.SignOptions);
  }
  
  /**
   * Generiert Refresh Token
   */
  generateRefreshToken(user: User): string {
    return jwt.sign(
      { userId: user.id as string, type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY } as jwt.SignOptions
    );
  }
  
  /**
   * Validiert Access Token
   */
  verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  }
  
  /**
   * Validiert Refresh Token
   */
  verifyRefreshToken(token: string): { userId: string } {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
    
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return { userId: payload.userId };
  }
}

