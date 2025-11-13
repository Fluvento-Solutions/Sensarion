import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { env } from './config/env';
import { errorHandler } from './infrastructure/http/errors/errorHandler';
import { correlationIdMiddleware } from './infrastructure/http/middleware/correlationId';
import { healthRoutes } from './infrastructure/http/routes/health';

/**
 * Erstellt und konfiguriert Fastify-Server
 */
async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL
    }
  });
  
  // CORS
  await fastify.register(cors, {
    origin: env.NODE_ENV === 'production' 
      ? ['https://sensarion.local']
      : ['http://localhost:5180', 'http://127.0.0.1:5180'],
    credentials: true
  });
  
  // Rate Limiting
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX_REQUESTS,
    timeWindow: env.RATE_LIMIT_WINDOW_MS
  });
  
  // Swagger/OpenAPI
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Sensarion v2 API',
        version: '2.0.0'
      },
      servers: [
        { url: `http://localhost:${env.PORT}`, description: 'Development' }
      ]
    }
  });
  
  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });
  
  // Global Middleware
  fastify.addHook('onRequest', correlationIdMiddleware);
  
  // Error Handler
  fastify.setErrorHandler(errorHandler);
  
  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(async (fastify) => {
    const { authRoutes } = await import('./infrastructure/http/routes/auth');
    return authRoutes(fastify);
  });
  await fastify.register(async (fastify) => {
    const { patientRoutes } = await import('./infrastructure/http/routes/patients');
    return patientRoutes(fastify);
  });
  await fastify.register(async (fastify) => {
    const { exportRoutes } = await import('./infrastructure/http/routes/exports');
    return exportRoutes(fastify);
  });
  await fastify.register(async (fastify) => {
    const { moduleRoutes } = await import('./infrastructure/http/routes/modules');
    return moduleRoutes(fastify);
  });
  await fastify.register(async (fastify) => {
    const { tenantRoutes } = await import('./infrastructure/http/routes/tenants');
    return tenantRoutes(fastify);
  });
  await fastify.register(async (fastify) => {
    const { adminRoutes } = await import('./infrastructure/http/routes/admin');
    return adminRoutes(fastify);
  });
  await fastify.register(async (fastify) => {
    const { calendarRoutes } = await import('./infrastructure/http/routes/calendar');
    return calendarRoutes(fastify);
  });
  
  return fastify;
}

/**
 * Startet den Server
 */
async function start() {
  try {
    const server = await buildServer();
    
    await server.listen({
      port: env.PORT,
      host: '0.0.0.0'
    });
    
    console.log(`✅ API server listening on http://localhost:${env.PORT}`);
    console.log(`📚 Swagger UI available at http://localhost:${env.PORT}/docs`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start wenn direkt ausgeführt
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { buildServer };

