import { FastifyInstance } from 'fastify';

/**
 * Health Check Route
 * 
 * GET /health
 * 
 * Prüft ob der Service verfügbar ist
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  });
}

