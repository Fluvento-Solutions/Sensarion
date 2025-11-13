import { FastifyInstance } from 'fastify';
// import { authMiddleware } from '../middleware/auth'; // Not used in auth routes
// import { tenantContextMiddleware } from '../middleware/tenantContext'; // Not used in auth routes
import { ProblemDetailsFactory } from '../errors/ProblemDetails';
import { LoginUseCase } from '@/app/use-cases/auth/LoginUseCase';
import { RefreshTokenUseCase } from '@/app/use-cases/auth/RefreshTokenUseCase';
import { UserRepository } from '@/infrastructure/db/repositories/UserRepository';
import { PasswordService } from '@/infrastructure/auth/PasswordService';
import { JWTService } from '@/infrastructure/auth/JWTService';

/**
 * Auth Routes
 * 
 * POST /auth/login
 * POST /auth/refresh
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Dependency Injection (TODO: Use IoC Container)
  const userRepository = new UserRepository();
  const passwordService = new PasswordService();
  const jwtService = new JWTService();
  const loginUseCase = new LoginUseCase(userRepository, passwordService, jwtService);
  const refreshTokenUseCase = new RefreshTokenUseCase(userRepository, jwtService);
  
  // POST /auth/login
  fastify.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const dto = request.body as { email: string; password: string };
      
      // Finde Tenant-ID: Suche User in allen Tenants (beim Login kennen wir den Tenant noch nicht)
      // TODO: Später: Tenant-ID aus Header/Subdomain ermitteln
      const { prisma } = await import('@/infrastructure/db/client');
      const user = await prisma.user.findFirst({
        where: {
          email: dto.email.toLowerCase().trim(),
          deletedAt: null
        }
      });
      
      if (!user) {
        throw ProblemDetailsFactory.unauthorized('Invalid email or password', request.url);
      }
      
      const tenantId = user.tenantId;
      
      const result = await loginUseCase.execute(dto, tenantId);
      
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('Invalid password')) {
          throw ProblemDetailsFactory.unauthorized(error.message, request.url);
        }
      }
      throw error;
    }
  });
  
  // POST /auth/refresh
  fastify.post('/auth/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };
      const result = await refreshTokenUseCase.execute(refreshToken);
      
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof Error) {
        throw ProblemDetailsFactory.unauthorized(error.message, request.url);
      }
      throw error;
    }
  });
}

