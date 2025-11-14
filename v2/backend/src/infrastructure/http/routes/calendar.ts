import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { ProblemDetailsFactory } from '../errors/ProblemDetails';
import { prisma } from '@/infrastructure/db/client';
import { addDays, addWeeks, addMonths, addYears, isAfter, isBefore, parseISO } from 'date-fns';

/**
 * Calendar Routes
 * 
 * GET /calendars
 * POST /calendars
 * GET /calendars/:id
 * PUT /calendars/:id
 * DELETE /calendars/:id
 * GET /calendar-events
 * POST /calendar-events
 * GET /calendar-events/:id
 * PUT /calendar-events/:id
 * DELETE /calendar-events/:id
 * GET /calendar-events/check-conflicts
 * POST /calendar-events/:id/participants
 * DELETE /calendar-events/:id/participants/:userId
 */
export async function calendarRoutes(fastify: FastifyInstance): Promise<void> {
  // ============================================================================
  // Calendars
  // ============================================================================
  
  fastify.get('/calendars', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    
    const calendars = await prisma.calendar.findMany({
      where: { tenantId: user.tenantId },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            shortName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    return reply.status(200).send({
      calendars: calendars.map(cal => ({
        id: cal.id,
        name: cal.name,
        type: cal.type,
        roomId: cal.roomId,
        purpose: cal.purpose,
        color: cal.color,
        ownerId: cal.ownerId,
        owner: cal.owner ? {
          id: cal.owner.id,
          displayName: cal.owner.displayName,
          shortName: cal.owner.shortName,
          email: cal.owner.email
        } : null,
        createdAt: cal.createdAt.toISOString(),
        updatedAt: cal.updatedAt.toISOString()
      }))
    });
  });
  
  fastify.post('/calendars', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['PERSONAL', 'ROOM', 'PURPOSE'] },
          roomId: { type: 'string' },
          purpose: { type: 'string' },
          color: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const dto = request.body as any;
    
    const calendar = await prisma.calendar.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        type: dto.type,
        roomId: dto.roomId,
        purpose: dto.purpose,
        color: dto.color || '#3b82f6',
        ownerId: user.id
      },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            shortName: true,
            email: true
          }
        }
      }
    });
    
    return reply.status(201).send({
      calendar: {
        id: calendar.id,
        name: calendar.name,
        type: calendar.type,
        roomId: calendar.roomId,
        purpose: calendar.purpose,
        color: calendar.color,
        ownerId: calendar.ownerId,
        owner: calendar.owner ? {
          id: calendar.owner.id,
          displayName: calendar.owner.displayName,
          shortName: calendar.owner.shortName,
          email: calendar.owner.email
        } : null,
        createdAt: calendar.createdAt.toISOString(),
        updatedAt: calendar.updatedAt.toISOString()
      }
    });
  });
  
  fastify.put('/calendars/:id', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['PERSONAL', 'ROOM', 'PURPOSE'] },
          roomId: { type: 'string' },
          purpose: { type: 'string' },
          color: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const dto = request.body as any;
    
    const existing = await prisma.calendar.findFirst({
      where: { id, tenantId: user.tenantId }
    });
    
    if (!existing) {
      throw ProblemDetailsFactory.notFound('Calendar', id, request.url);
    }
    
    const calendar = await prisma.calendar.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        roomId: dto.roomId,
        purpose: dto.purpose,
        color: dto.color
      },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            shortName: true,
            email: true
          }
        }
      }
    });
    
    return reply.status(200).send({
      calendar: {
        id: calendar.id,
        name: calendar.name,
        type: calendar.type,
        roomId: calendar.roomId,
        purpose: calendar.purpose,
        color: calendar.color,
        ownerId: calendar.ownerId,
        owner: calendar.owner ? {
          id: calendar.owner.id,
          displayName: calendar.owner.displayName,
          shortName: calendar.owner.shortName,
          email: calendar.owner.email
        } : null,
        createdAt: calendar.createdAt.toISOString(),
        updatedAt: calendar.updatedAt.toISOString()
      }
    });
  });
  
  fastify.delete('/calendars/:id', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const existing = await prisma.calendar.findFirst({
      where: { id, tenantId: user.tenantId }
    });
    
    if (!existing) {
      throw ProblemDetailsFactory.notFound('Calendar', id, request.url);
    }
    
    await prisma.calendar.delete({ where: { id } });
    
    return reply.status(204).send();
  });

  // ============================================================================
  // Calendar Events
  // ============================================================================
  
  fastify.get('/calendar-events', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          calendarIds: { type: 'array', items: { type: 'string' } },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user!;
      const { calendarIds, startDate, endDate } = request.query as any;
      
      // First, get all calendar IDs for this tenant
      const tenantCalendars = await prisma.calendar.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true }
      });
      const tenantCalendarIds = tenantCalendars.map(c => c.id);
      
      if (tenantCalendarIds.length === 0) {
        return reply.status(200).send({ events: [] });
      }
      
      // Build where clause
      const whereConditions: any[] = [
        {
          calendarId: { in: tenantCalendarIds }
        }
      ];
      
      // Filter by specific calendar IDs if provided (must be subset of tenant calendars)
      if (calendarIds && Array.isArray(calendarIds) && calendarIds.length > 0) {
        const validCalendarIds = calendarIds.filter((id: string) => tenantCalendarIds.includes(id));
        if (validCalendarIds.length > 0) {
          whereConditions[0] = { calendarId: { in: validCalendarIds } };
        } else {
          return reply.status(200).send({ events: [] });
        }
      }
      
      // Filter by date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        whereConditions.push({
          OR: [
            { startTime: { gte: start, lte: end } },
            { endTime: { gte: start, lte: end } },
            { AND: [{ startTime: { lte: start } }, { endTime: { gte: end } }] }
          ]
        });
      }
      
      const where = whereConditions.length === 1 ? whereConditions[0] : { AND: whereConditions };
      
      const events = await prisma.calendarEvent.findMany({
        where,
      include: {
        calendar: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true,
            birthDate: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                shortName: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });
    
    return reply.status(200).send({
      events: events.map(event => ({
        id: event.id,
        calendarId: event.calendarId,
        title: event.title,
        description: event.description,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.location,
        patientId: event.patientId,
        patient: event.patient ? {
          id: event.patient.id,
          name: event.patient.name as any
        } : null,
        recurrenceRule: event.recurrenceRule as any,
        recurrenceEndDate: event.recurrenceEndDate?.toISOString(),
        calendar: {
          id: event.calendar.id,
          name: event.calendar.name,
          type: event.calendar.type,
          color: event.calendar.color
        },
        participants: event.participants.map(p => ({
          id: p.id,
          userId: p.userId,
          user: {
            id: p.user.id,
            displayName: p.user.displayName,
            shortName: p.user.shortName,
            email: p.user.email
          },
          createdAt: p.createdAt.toISOString()
        })),
        createdBy: event.createdBy,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString()
      }))
    });
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        meta: error?.meta
      });
      // Return a proper error response
      if (error?.code === 'P2002') {
        throw ProblemDetailsFactory.conflict('Calendar event conflict', request.url);
      }
      if (error?.code?.startsWith('P')) {
        throw ProblemDetailsFactory.badRequest(`Database error: ${error.message}`, request.url);
      }
      throw ProblemDetailsFactory.internalServerError(
        error?.message || 'Fehler beim Abrufen der Kalender-Events',
        request.url
      );
    }
  });
  
  fastify.post('/calendar-events', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['calendarId', 'title', 'startTime', 'endTime'],
        properties: {
          calendarId: { type: 'string' },
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          location: { type: 'string' },
          patientId: { type: 'string' },
          recurrenceRule: { type: 'object' },
          recurrenceEndDate: { type: 'string', format: 'date-time' },
          participantIds: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const dto = request.body as any;
    
    // Validate calendar belongs to tenant
    const calendar = await prisma.calendar.findFirst({
      where: { id: dto.calendarId, tenantId: user.tenantId }
    });
    
    if (!calendar) {
      throw ProblemDetailsFactory.notFound('Calendar', dto.calendarId, request.url);
    }
    
    // Validate start < end
    if (new Date(dto.startTime) >= new Date(dto.endTime)) {
      throw ProblemDetailsFactory.badRequest('Endzeit muss nach Startzeit liegen', request.url);
    }
    
    const event = await prisma.calendarEvent.create({
      data: {
        calendarId: dto.calendarId,
        title: dto.title,
        description: dto.description,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        location: dto.location,
        patientId: dto.patientId,
        recurrenceRule: dto.recurrenceRule,
        recurrenceEndDate: dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : null,
        createdBy: user.id
      },
      include: {
        calendar: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true,
            birthDate: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                shortName: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    // Add participants
    if (dto.participantIds && dto.participantIds.length > 0) {
      await prisma.calendarEventParticipant.createMany({
        data: dto.participantIds.map((userId: string) => ({
          eventId: event.id,
          userId
        }))
      });
      
      // Reload with participants
      const eventWithParticipants = await prisma.calendarEvent.findUnique({
        where: { id: event.id },
        include: {
          calendar: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true
            }
          },
          patient: {
            select: {
              id: true,
              name: true
            }
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  shortName: true,
                  email: true
                }
              }
            }
          }
        }
      });
      
      return reply.status(201).send({
        event: {
          id: eventWithParticipants!.id,
          calendarId: eventWithParticipants!.calendarId,
          title: eventWithParticipants!.title,
          description: eventWithParticipants!.description,
          startTime: eventWithParticipants!.startTime.toISOString(),
          endTime: eventWithParticipants!.endTime.toISOString(),
          location: eventWithParticipants!.location,
          patientId: eventWithParticipants!.patientId,
          patient: eventWithParticipants!.patient ? {
            id: eventWithParticipants!.patient.id,
            name: eventWithParticipants!.patient.name as any
          } : null,
          recurrenceRule: eventWithParticipants!.recurrenceRule as any,
          recurrenceEndDate: eventWithParticipants!.recurrenceEndDate?.toISOString(),
          calendar: {
            id: eventWithParticipants!.calendar.id,
            name: eventWithParticipants!.calendar.name,
            type: eventWithParticipants!.calendar.type,
            color: eventWithParticipants!.calendar.color
          },
          participants: eventWithParticipants!.participants.map(p => ({
            id: p.id,
            userId: p.userId,
            user: {
              id: p.user.id,
              displayName: p.user.displayName,
              shortName: p.user.shortName,
              email: p.user.email
            },
            createdAt: p.createdAt.toISOString()
          })),
          createdBy: eventWithParticipants!.createdBy,
          createdAt: eventWithParticipants!.createdAt.toISOString(),
          updatedAt: eventWithParticipants!.updatedAt.toISOString()
        }
      });
    }
    
    return reply.status(201).send({
      event: {
        id: event.id,
        calendarId: event.calendarId,
        title: event.title,
        description: event.description,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.location,
        patientId: event.patientId,
        patient: event.patient ? {
          id: event.patient.id,
          name: event.patient.name as any
        } : null,
        recurrenceRule: event.recurrenceRule as any,
        recurrenceEndDate: event.recurrenceEndDate?.toISOString(),
        calendar: {
          id: event.calendar.id,
          name: event.calendar.name,
          type: event.calendar.type,
          color: event.calendar.color
        },
        participants: [],
        createdBy: event.createdBy,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString()
      }
    });
  });
  
  fastify.put('/calendar-events/:id', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        properties: {
          calendarId: { type: 'string' },
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          location: { type: 'string' },
          patientId: { type: 'string' },
          recurrenceRule: { type: 'object' },
          recurrenceEndDate: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const dto = request.body as any;
    
    const existing = await prisma.calendarEvent.findFirst({
      where: {
        id,
        calendar: { tenantId: user.tenantId }
      }
    });
    
    if (!existing) {
      throw ProblemDetailsFactory.notFound('CalendarEvent', id, request.url);
    }
    
    // Validate start < end if both provided
    if (dto.startTime && dto.endTime) {
      if (new Date(dto.startTime) >= new Date(dto.endTime)) {
        throw ProblemDetailsFactory.badRequest('Endzeit muss nach Startzeit liegen', request.url);
      }
    }
    
    const updateData: any = {};
    if (dto.calendarId) updateData.calendarId = dto.calendarId;
    if (dto.title) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.startTime) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime) updateData.endTime = new Date(dto.endTime);
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.patientId !== undefined) updateData.patientId = dto.patientId;
    if (dto.recurrenceRule !== undefined) updateData.recurrenceRule = dto.recurrenceRule;
    if (dto.recurrenceEndDate !== undefined) updateData.recurrenceEndDate = dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : null;
    
    const event = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        calendar: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true,
            birthDate: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                shortName: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    return reply.status(200).send({
      event: {
        id: event.id,
        calendarId: event.calendarId,
        title: event.title,
        description: event.description,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.location,
        patientId: event.patientId,
        patient: event.patient ? {
          id: event.patient.id,
          name: event.patient.name as any
        } : null,
        recurrenceRule: event.recurrenceRule as any,
        recurrenceEndDate: event.recurrenceEndDate?.toISOString(),
        calendar: {
          id: event.calendar.id,
          name: event.calendar.name,
          type: event.calendar.type,
          color: event.calendar.color
        },
        participants: event.participants.map(p => ({
          id: p.id,
          userId: p.userId,
          user: {
            id: p.user.id,
            displayName: p.user.displayName,
            shortName: p.user.shortName,
            email: p.user.email
          },
          createdAt: p.createdAt.toISOString()
        })),
        createdBy: event.createdBy,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString()
      }
    });
  });
  
  fastify.delete('/calendar-events/:id', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    
    const existing = await prisma.calendarEvent.findFirst({
      where: {
        id,
        calendar: { tenantId: user.tenantId }
      }
    });
    
    if (!existing) {
      throw ProblemDetailsFactory.notFound('CalendarEvent', id, request.url);
    }
    
    await prisma.calendarEvent.delete({ where: { id } });
    
    return reply.status(204).send();
  });
  
  // ============================================================================
  // Event Conflicts
  // ============================================================================
  
  fastify.get('/calendar-events/check-conflicts', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      querystring: {
        type: 'object',
        required: ['startTime', 'endTime'],
        properties: {
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          location: { type: 'string' },
          participantIds: { type: 'array', items: { type: 'string' } },
          excludeEventId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { startTime, endTime, location, participantIds, excludeEventId } = request.query as any;
    
    const conflicts: any[] = [];
    const queryStart = new Date(startTime);
    const queryEnd = new Date(endTime);
    
    // Find overlapping events
    const overlappingEvents = await prisma.calendarEvent.findMany({
      where: {
        calendar: { tenantId: user.tenantId },
        ...(excludeEventId && { id: { not: excludeEventId } }),
        OR: [
          { startTime: { gte: queryStart, lte: queryEnd } },
          { endTime: { gte: queryStart, lte: queryEnd } },
          { AND: [{ startTime: { lte: queryStart } }, { endTime: { gte: queryEnd } }] }
        ]
      },
      include: {
        calendar: {
          select: {
            id: true,
            name: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        }
      }
    });
    
    // Check location conflicts
    if (location) {
      overlappingEvents.forEach(event => {
        if (event.location === location) {
          conflicts.push({
            type: 'location',
            eventId: event.id,
            eventTitle: event.title,
            calendarName: event.calendar.name,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString(),
            location: event.location
          });
        }
      });
    }
    
    // Check participant conflicts
    if (participantIds && participantIds.length > 0) {
      overlappingEvents.forEach(event => {
        const conflictingParticipants = event.participants.filter(p => 
          participantIds.includes(p.userId)
        );
        
        if (conflictingParticipants.length > 0) {
          conflicts.push({
            type: 'participant',
            eventId: event.id,
            eventTitle: event.title,
            calendarName: event.calendar.name,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString(),
            conflictingParticipants: conflictingParticipants.map(p => ({
              id: p.user.id,
              displayName: p.user.displayName
            }))
          });
        }
      });
    }
    
    return reply.status(200).send({
      conflicts,
      hasConflicts: conflicts.length > 0
    });
  });
  
  // ============================================================================
  // Event Participants
  // ============================================================================
  
  fastify.post('/calendar-events/:id/participants', {
    preHandler: [authMiddleware, tenantContextMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const { userId } = request.body as { userId: string };
    
    const event = await prisma.calendarEvent.findFirst({
      where: {
        id,
        calendar: { tenantId: user.tenantId }
      }
    });
    
    if (!event) {
      throw ProblemDetailsFactory.notFound('CalendarEvent', id, request.url);
    }
    
    const participant = await prisma.calendarEventParticipant.create({
      data: {
        eventId: id,
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            shortName: true,
            email: true
          }
        }
      }
    });
    
    return reply.status(201).send({
      participant: {
        id: participant.id,
        userId: participant.userId,
        user: {
          id: participant.user.id,
          displayName: participant.user.displayName,
          shortName: participant.user.shortName,
          email: participant.user.email
        },
        createdAt: participant.createdAt.toISOString()
      }
    });
  });
  
  fastify.delete('/calendar-events/:id/participants/:userId', {
    preHandler: [authMiddleware, tenantContextMiddleware]
  }, async (request, reply) => {
    const user = request.user!;
    const { id, userId } = request.params as { id: string; userId: string };
    
    const event = await prisma.calendarEvent.findFirst({
      where: {
        id,
        calendar: { tenantId: user.tenantId }
      }
    });
    
    if (!event) {
      throw ProblemDetailsFactory.notFound('CalendarEvent', id, request.url);
    }
    
    await prisma.calendarEventParticipant.deleteMany({
      where: {
        eventId: id,
        userId
      }
    });
    
    return reply.status(204).send();
  });
}

