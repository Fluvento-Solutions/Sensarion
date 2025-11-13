import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { addDays, addWeeks, addMonths, addYears, isAfter, isBefore, startOfDay, endOfDay, parseISO, format } from 'date-fns';

import { env } from '../config/env';
import { prisma } from '../db/client';

const router = Router();

type AuthenticatedRequest = Request & { authUserId: string };

// Helper: Extract user from token
const getAuthUser = async (req: Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  try {
    const payload = jwt.verify(token, env.SESSION_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { practice: true }
    });
    return user;
  } catch {
    return null;
  }
};

// Extend AuthenticatedRequest
type AuthenticatedRequestWithUser = AuthenticatedRequest & { authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>> };

// Helper: Require auth middleware
const requireAuth = async (req: Request, res: Response, next: () => void) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentifizierung erforderlich',
      code: 'AUTH_REQUIRED'
    });
  }
  (req as AuthenticatedRequestWithUser).authUserId = user.id;
  (req as AuthenticatedRequestWithUser).authUser = user;
  next();
};

// Helper: Calculate recurring event instances
const calculateRecurringInstances = (
  startTime: Date,
  endTime: Date,
  recurrenceRule: { type: string; endAfter?: number; endDate?: string } | null,
  recurrenceEndDate: Date | null,
  queryStart: Date,
  queryEnd: Date
): Array<{ startTime: Date; endTime: Date }> => {
  if (!recurrenceRule) {
    return [{ startTime, endTime }];
  }

  const instances: Array<{ startTime: Date; endTime: Date }> = [];
  const duration = endTime.getTime() - startTime.getTime();
  let currentStart = new Date(startTime);
  let currentEnd = new Date(endTime);
  let count = 0;

  const shouldStop = () => {
    if (recurrenceRule.endAfter && count >= recurrenceRule.endAfter) return true;
    if (recurrenceRule.endDate) {
      const endDate = parseISO(recurrenceRule.endDate);
      if (isAfter(currentStart, endDate)) return true;
    }
    if (recurrenceEndDate && isAfter(currentStart, recurrenceEndDate)) return true;
    if (isAfter(currentStart, queryEnd)) return true;
    return false;
  };

  while (!shouldStop()) {
    if (isAfter(currentStart, queryEnd)) break;
    if (isBefore(currentEnd, queryStart)) {
      // Skip this instance, it's before our query range
    } else {
      instances.push({ startTime: new Date(currentStart), endTime: new Date(currentEnd) });
    }

    count++;
    switch (recurrenceRule.type) {
      case 'daily':
        currentStart = addDays(currentStart, 1);
        break;
      case 'weekly':
        currentStart = addWeeks(currentStart, 1);
        break;
      case 'biweekly':
        currentStart = addWeeks(currentStart, 2);
        break;
      case 'monthly':
        currentStart = addMonths(currentStart, 1);
        break;
      case 'quarterly':
        currentStart = addMonths(currentStart, 3);
        break;
      case 'yearly':
        currentStart = addYears(currentStart, 1);
        break;
      default:
        return instances;
    }
    currentEnd = new Date(currentStart.getTime() + duration);
  }

  return instances;
};

// Helper: Check for time overlap
const hasTimeOverlap = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
  return start1 < end2 && start2 < end1;
};

// Schemas
const createCalendarSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  type: z.enum(['PERSONAL', 'ROOM', 'PURPOSE']),
  roomId: z.string().optional(),
  purpose: z.string().optional(),
  color: z.string().optional()
});

const updateCalendarSchema = createCalendarSchema.partial();

const eventSchemaBase = z.object({
  calendarId: z.string().min(1, 'Kalender-ID ist erforderlich'),
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().optional(),
  patientId: z.string().optional(),
  recurrenceRule: z.object({
    type: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
    endAfter: z.number().positive().optional(),
    endDate: z.string().datetime().optional()
  }).optional(),
  recurrenceEndDate: z.string().datetime().optional(),
  participantIds: z.array(z.string()).optional().default([])
});

const createEventSchema = eventSchemaBase.refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return start < end;
}, {
  message: 'Endzeit muss nach Startzeit liegen'
});

const updateEventSchema = eventSchemaBase.partial().refine((data) => {
  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    return start < end;
  }
  return true;
}, {
  message: 'Endzeit muss nach Startzeit liegen'
});

// GET /api/calendar/calendars - Alle Kalender für die Praxis abrufen
router.get('/calendars', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const calendars = await prisma.calendar.findMany({
      where: { practiceId: user.practiceId },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            shortName: true,
            email: true
          }
        },
        room: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({
      status: 'ok',
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
        room: cal.room ? {
          id: cal.room.id,
          name: cal.room.name
        } : null,
        createdAt: cal.createdAt.toISOString(),
        updatedAt: cal.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    console.error('get calendars failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Kalender'
    });
  }
});

// GET /api/calendar/calendars/:id - Einzelnen Kalender abrufen
router.get('/calendars/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const calendar = await prisma.calendar.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            shortName: true,
            email: true
          }
        },
        room: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!calendar) {
      return res.status(404).json({
        status: 'error',
        message: 'Kalender nicht gefunden'
      });
    }

    return res.json({
      status: 'ok',
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
        room: calendar.room ? {
          id: calendar.room.id,
          name: calendar.room.name
        } : null,
        createdAt: calendar.createdAt.toISOString(),
        updatedAt: calendar.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('get calendar failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden des Kalenders'
    });
  }
});

// POST /api/calendar/calendars - Neuen Kalender erstellen
router.post('/calendars', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = createCalendarSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    // Validate roomId if provided
    if (parsed.data.roomId) {
      const room = await prisma.room.findFirst({
        where: {
          id: parsed.data.roomId,
          practiceId: user.practiceId
        }
      });
      if (!room) {
        return res.status(400).json({
          status: 'error',
          message: 'Raum nicht gefunden'
        });
      }
    }

    const calendar = await prisma.calendar.create({
      data: {
        practiceId: user.practiceId,
        name: parsed.data.name,
        type: parsed.data.type,
        roomId: parsed.data.roomId || null,
        purpose: parsed.data.purpose || null,
        color: parsed.data.color || null,
        ownerId: parsed.data.type === 'PERSONAL' ? user.id : null
      },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            shortName: true,
            email: true
          }
        },
        room: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.status(201).json({
      status: 'ok',
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
        room: calendar.room ? {
          id: calendar.room.id,
          name: calendar.room.name
        } : null,
        createdAt: calendar.createdAt.toISOString(),
        updatedAt: calendar.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('create calendar failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Erstellen des Kalenders'
    });
  }
});

// PUT /api/calendar/calendars/:id - Kalender aktualisieren
router.put('/calendars/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateCalendarSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const existing = await prisma.calendar.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Kalender nicht gefunden'
      });
    }

    // Validate roomId if provided
    if (parsed.data.roomId) {
      const room = await prisma.room.findFirst({
        where: {
          id: parsed.data.roomId,
          practiceId: user.practiceId
        }
      });
      if (!room) {
        return res.status(400).json({
          status: 'error',
          message: 'Raum nicht gefunden'
        });
      }
    }

    const calendar = await prisma.calendar.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.name && { name: parsed.data.name }),
        ...(parsed.data.type && { type: parsed.data.type }),
        ...(parsed.data.roomId !== undefined && { roomId: parsed.data.roomId || null }),
        ...(parsed.data.purpose !== undefined && { purpose: parsed.data.purpose || null }),
        ...(parsed.data.color !== undefined && { color: parsed.data.color || null })
      },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            shortName: true,
            email: true
          }
        },
        room: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.json({
      status: 'ok',
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
        room: calendar.room ? {
          id: calendar.room.id,
          name: calendar.room.name
        } : null,
        createdAt: calendar.createdAt.toISOString(),
        updatedAt: calendar.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('update calendar failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Aktualisieren des Kalenders'
    });
  }
});

// DELETE /api/calendar/calendars/:id - Kalender löschen
router.delete('/calendars/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const existing = await prisma.calendar.findFirst({
      where: {
        id: req.params.id,
        practiceId: user.practiceId
      }
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Kalender nicht gefunden'
      });
    }

    await prisma.calendar.delete({
      where: { id: req.params.id }
    });

    return res.json({
      status: 'ok',
      message: 'Kalender gelöscht'
    });
  } catch (error) {
    console.error('delete calendar failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Löschen des Kalenders'
    });
  }
});

// GET /api/calendar/events - Termine abrufen
router.get('/events', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const calendarIds = req.query.calendarIds ? (Array.isArray(req.query.calendarIds) ? req.query.calendarIds : [req.query.calendarIds]) as string[] : undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : startOfDay(new Date());
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : endOfDay(addDays(new Date(), 30));

    // Get calendars for practice
    const calendars = await prisma.calendar.findMany({
      where: {
        practiceId: user.practiceId,
        ...(calendarIds && { id: { in: calendarIds } })
      }
    });

    const calendarIdList = calendars.map(c => c.id);

    // Get events in date range
    const events = await prisma.calendarEvent.findMany({
      where: {
        calendarId: { in: calendarIdList },
        OR: [
          {
            AND: [
              { startTime: { lte: endDate } },
              { endTime: { gte: startDate } }
            ]
          },
          {
            recurrenceRule: { not: null }
          }
        ]
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
      },
      orderBy: { startTime: 'asc' }
    });

    // Expand recurring events
    const expandedEvents: any[] = [];
    for (const event of events) {
      const recurrenceRule = event.recurrenceRule as { type: string; endAfter?: number; endDate?: string } | null;
      const instances = calculateRecurringInstances(
        event.startTime,
        event.endTime,
        recurrenceRule,
        event.recurrenceEndDate,
        startDate,
        endDate
      );

      for (const instance of instances) {
        expandedEvents.push({
          id: event.id,
          calendarId: event.calendarId,
          title: event.title,
          description: event.description,
          startTime: instance.startTime.toISOString(),
          endTime: instance.endTime.toISOString(),
          location: event.location,
          patientId: event.patientId,
          patient: event.patient ? {
            id: event.patient.id,
            name: event.patient.name
          } : null,
          recurrenceRule: event.recurrenceRule,
          recurrenceEndDate: event.recurrenceEndDate?.toISOString() || null,
          calendar: event.calendar,
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
        });
      }
    }

    return res.json({
      status: 'ok',
      events: expandedEvents
    });
  } catch (error) {
    console.error('get events failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Termine'
    });
  }
});

// GET /api/calendar/events/:id - Einzelnen Termin abrufen
router.get('/events/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: req.params.id,
        calendar: {
          practiceId: user.practiceId
        }
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

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Termin nicht gefunden'
      });
    }

    return res.json({
      status: 'ok',
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
          name: event.patient.name
        } : null,
        recurrenceRule: event.recurrenceRule,
        recurrenceEndDate: event.recurrenceEndDate?.toISOString() || null,
        calendar: event.calendar,
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
  } catch (error) {
    console.error('get event failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden des Termins'
    });
  }
});

// POST /api/calendar/events - Neuen Termin erstellen
router.post('/events', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    // Verify calendar belongs to practice
    const calendar = await prisma.calendar.findFirst({
      where: {
        id: parsed.data.calendarId,
        practiceId: user.practiceId
      }
    });

    if (!calendar) {
      return res.status(404).json({
        status: 'error',
        message: 'Kalender nicht gefunden'
      });
    }

    // Verify patient if provided
    if (parsed.data.patientId) {
      const patient = await prisma.patient.findFirst({
        where: {
          id: parsed.data.patientId,
          practiceId: user.practiceId
        }
      });
      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient nicht gefunden'
        });
      }
    }

    // Verify participants if provided
    if (parsed.data.participantIds && parsed.data.participantIds.length > 0) {
      const participants = await prisma.user.findMany({
        where: {
          id: { in: parsed.data.participantIds },
          practiceId: user.practiceId
        }
      });
      if (participants.length !== parsed.data.participantIds.length) {
        return res.status(400).json({
          status: 'error',
          message: 'Ein oder mehrere Teilnehmer nicht gefunden'
        });
      }
    }

    const event = await prisma.calendarEvent.create({
      data: {
        calendarId: parsed.data.calendarId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        location: parsed.data.location || null,
        patientId: parsed.data.patientId || null,
        recurrenceRule: parsed.data.recurrenceRule || null,
        recurrenceEndDate: parsed.data.recurrenceEndDate ? new Date(parsed.data.recurrenceEndDate) : null,
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

    // Add participants
    if (parsed.data.participantIds && parsed.data.participantIds.length > 0) {
      await prisma.calendarEventParticipant.createMany({
        data: parsed.data.participantIds.map(userId => ({
          eventId: event.id,
          userId
        }))
      });

      // Reload event with participants
      const eventWithParticipants = await prisma.calendarEvent.findUnique({
        where: { id: event.id },
        include: {
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

      if (eventWithParticipants) {
        return res.status(201).json({
          status: 'ok',
          event: {
            id: eventWithParticipants.id,
            calendarId: eventWithParticipants.calendarId,
            title: eventWithParticipants.title,
            description: eventWithParticipants.description,
            startTime: eventWithParticipants.startTime.toISOString(),
            endTime: eventWithParticipants.endTime.toISOString(),
            location: eventWithParticipants.location,
            patientId: eventWithParticipants.patientId,
            patient: event.patient ? {
              id: event.patient.id,
              name: event.patient.name
            } : null,
            recurrenceRule: eventWithParticipants.recurrenceRule,
            recurrenceEndDate: eventWithParticipants.recurrenceEndDate?.toISOString() || null,
            calendar: event.calendar,
            participants: eventWithParticipants.participants.map(p => ({
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
            createdBy: eventWithParticipants.createdBy,
            createdAt: eventWithParticipants.createdAt.toISOString(),
            updatedAt: eventWithParticipants.updatedAt.toISOString()
          }
        });
      }
    }

    return res.status(201).json({
      status: 'ok',
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
          name: event.patient.name
        } : null,
        recurrenceRule: event.recurrenceRule,
        recurrenceEndDate: event.recurrenceEndDate?.toISOString() || null,
        calendar: event.calendar,
        participants: [],
        createdBy: event.createdBy,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('create event failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Erstellen des Termins'
    });
  }
});

// PUT /api/calendar/events/:id - Termin aktualisieren
router.put('/events/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const parsed = updateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const existing = await prisma.calendarEvent.findFirst({
      where: {
        id: req.params.id,
        calendar: {
          practiceId: user.practiceId
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Termin nicht gefunden'
      });
    }

    // Verify calendar if provided
    if (parsed.data.calendarId) {
      const calendar = await prisma.calendar.findFirst({
        where: {
          id: parsed.data.calendarId,
          practiceId: user.practiceId
        }
      });
      if (!calendar) {
        return res.status(404).json({
          status: 'error',
          message: 'Kalender nicht gefunden'
        });
      }
    }

    // Verify patient if provided
    if (parsed.data.patientId !== undefined) {
      if (parsed.data.patientId) {
        const patient = await prisma.patient.findFirst({
          where: {
            id: parsed.data.patientId,
            practiceId: user.practiceId
          }
        });
        if (!patient) {
          return res.status(404).json({
            status: 'error',
            message: 'Patient nicht gefunden'
          });
        }
      }
    }

    const event = await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.calendarId && { calendarId: parsed.data.calendarId }),
        ...(parsed.data.title && { title: parsed.data.title }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
        ...(parsed.data.startTime && { startTime: new Date(parsed.data.startTime) }),
        ...(parsed.data.endTime && { endTime: new Date(parsed.data.endTime) }),
        ...(parsed.data.location !== undefined && { location: parsed.data.location || null }),
        ...(parsed.data.patientId !== undefined && { patientId: parsed.data.patientId || null }),
        ...(parsed.data.recurrenceRule !== undefined && { recurrenceRule: parsed.data.recurrenceRule || null }),
        ...(parsed.data.recurrenceEndDate !== undefined && { recurrenceEndDate: parsed.data.recurrenceEndDate ? new Date(parsed.data.recurrenceEndDate) : null })
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

    return res.json({
      status: 'ok',
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
          name: event.patient.name
        } : null,
        recurrenceRule: event.recurrenceRule,
        recurrenceEndDate: event.recurrenceEndDate?.toISOString() || null,
        calendar: event.calendar,
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
  } catch (error) {
    console.error('update event failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Aktualisieren des Termins'
    });
  }
});

// DELETE /api/calendar/events/:id - Termin löschen
router.delete('/events/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const deleteAll = req.query.deleteAll === 'true';

    const existing = await prisma.calendarEvent.findFirst({
      where: {
        id: req.params.id,
        calendar: {
          practiceId: user.practiceId
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Termin nicht gefunden'
      });
    }

    if (deleteAll && existing.recurrenceRule) {
      // Delete all recurring instances (delete the base event)
      await prisma.calendarEvent.delete({
        where: { id: req.params.id }
      });
    } else {
      // Delete only this instance
      await prisma.calendarEvent.delete({
        where: { id: req.params.id }
      });
    }

    return res.json({
      status: 'ok',
      message: 'Termin gelöscht'
    });
  } catch (error) {
    console.error('delete event failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Löschen des Termins'
    });
  }
});

// POST /api/calendar/events/:id/participants - Teilnehmer hinzufügen
router.post('/events/:id/participants', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const schema = z.object({
      userId: z.string().min(1, 'Benutzer-ID ist erforderlich')
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: req.params.id,
        calendar: {
          practiceId: user.practiceId
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Termin nicht gefunden'
      });
    }

    // Verify user belongs to practice
    const participantUser = await prisma.user.findFirst({
      where: {
        id: parsed.data.userId,
        practiceId: user.practiceId
      }
    });

    if (!participantUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Benutzer nicht gefunden'
      });
    }

    // Check if already participant
    const existing = await prisma.calendarEventParticipant.findUnique({
      where: {
        eventId_userId: {
          eventId: req.params.id,
          userId: parsed.data.userId
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: 'Benutzer ist bereits Teilnehmer'
      });
    }

    const participant = await prisma.calendarEventParticipant.create({
      data: {
        eventId: req.params.id,
        userId: parsed.data.userId
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

    return res.status(201).json({
      status: 'ok',
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
  } catch (error) {
    console.error('add participant failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Hinzufügen des Teilnehmers'
    });
  }
});

// DELETE /api/calendar/events/:id/participants/:userId - Teilnehmer entfernen
router.delete('/events/:id/participants/:userId', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: req.params.id,
        calendar: {
          practiceId: user.practiceId
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Termin nicht gefunden'
      });
    }

    await prisma.calendarEventParticipant.delete({
      where: {
        eventId_userId: {
          eventId: req.params.id,
          userId: req.params.userId
        }
      }
    });

    return res.json({
      status: 'ok',
      message: 'Teilnehmer entfernt'
    });
  } catch (error) {
    console.error('remove participant failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Entfernen des Teilnehmers'
    });
  }
});

// GET /api/calendar/events/conflicts - Konflikte prüfen
router.get('/events/conflicts', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const startTime = req.query.startTime ? new Date(req.query.startTime as string) : null;
    const endTime = req.query.endTime ? new Date(req.query.endTime as string) : null;
    const location = req.query.location as string | undefined;
    const participantIds = req.query.participantIds ? (Array.isArray(req.query.participantIds) ? req.query.participantIds : [req.query.participantIds]) as string[] : undefined;
    const excludeEventId = req.query.excludeEventId as string | undefined;

    if (!startTime || !endTime) {
      return res.status(400).json({
        status: 'error',
        message: 'startTime und endTime sind erforderlich'
      });
    }

    const conflicts: any[] = [];

    // Get all events in practice that overlap with the time range
    const calendars = await prisma.calendar.findMany({
      where: { practiceId: user.practiceId }
    });

    const calendarIdList = calendars.map(c => c.id);

    const overlappingEvents = await prisma.calendarEvent.findMany({
      where: {
        calendarId: { in: calendarIdList },
        ...(excludeEventId && { id: { not: excludeEventId } }),
        OR: [
          {
            AND: [
              { startTime: { lte: endTime } },
              { endTime: { gte: startTime } }
            ]
          },
          {
            recurrenceRule: { not: null }
          }
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

    // Check for location conflicts
    if (location) {
      for (const event of overlappingEvents) {
        if (event.location && event.location.toLowerCase() === location.toLowerCase()) {
          const recurrenceRule = event.recurrenceRule as { type: string; endAfter?: number; endDate?: string } | null;
          const instances = calculateRecurringInstances(
            event.startTime,
            event.endTime,
            recurrenceRule,
            event.recurrenceEndDate,
            startTime,
            endTime
          );

          for (const instance of instances) {
            if (hasTimeOverlap(startTime, endTime, instance.startTime, instance.endTime)) {
              conflicts.push({
                type: 'location',
                eventId: event.id,
                eventTitle: event.title,
                calendarName: event.calendar.name,
                startTime: instance.startTime.toISOString(),
                endTime: instance.endTime.toISOString(),
                location: event.location
              });
            }
          }
        }
      }
    }

    // Check for participant conflicts
    if (participantIds && participantIds.length > 0) {
      for (const event of overlappingEvents) {
        const eventParticipantIds = event.participants.map(p => p.userId);
        const hasCommonParticipants = participantIds.some(id => eventParticipantIds.includes(id));

        if (hasCommonParticipants) {
          const recurrenceRule = event.recurrenceRule as { type: string; endAfter?: number; endDate?: string } | null;
          const instances = calculateRecurringInstances(
            event.startTime,
            event.endTime,
            recurrenceRule,
            event.recurrenceEndDate,
            startTime,
            endTime
          );

          for (const instance of instances) {
            if (hasTimeOverlap(startTime, endTime, instance.startTime, instance.endTime)) {
              const conflictingParticipants = event.participants
                .filter(p => participantIds.includes(p.userId))
                .map(p => ({
                  id: p.user.id,
                  displayName: p.user.displayName
                }));

              conflicts.push({
                type: 'participant',
                eventId: event.id,
                eventTitle: event.title,
                calendarName: event.calendar.name,
                startTime: instance.startTime.toISOString(),
                endTime: instance.endTime.toISOString(),
                conflictingParticipants
              });
            }
          }
        }
      }
    }

    return res.json({
      status: 'ok',
      conflicts,
      hasConflicts: conflicts.length > 0
    });
  } catch (error) {
    console.error('check conflicts failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Prüfen der Konflikte'
    });
  }
});

// GET /api/calendar/rooms - Alle Räume für die Praxis abrufen
router.get('/rooms', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const rooms = await prisma.room.findMany({
      where: { practiceId: user.practiceId },
      orderBy: { name: 'asc' }
    });

    return res.json({
      status: 'ok',
      rooms: rooms.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description
      }))
    });
  } catch (error) {
    console.error('get rooms failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Räume'
    });
  }
});

// GET /api/calendar/users - Alle Benutzer für die Praxis abrufen
router.get('/users', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequestWithUser).authUser;
    if (!user?.practiceId) {
      return res.status(403).json({
        status: 'error',
        message: 'Keine Praxis zugeordnet'
      });
    }

    const users = await prisma.user.findMany({
      where: { practiceId: user.practiceId },
      select: {
        id: true,
        email: true,
        displayName: true,
        shortName: true
      },
      orderBy: { displayName: 'asc' }
    });

    return res.json({
      status: 'ok',
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        shortName: u.shortName
      }))
    });
  } catch (error) {
    console.error('get users failed', error);
    return res.status(500).json({
      status: 'error',
      message: 'Fehler beim Laden der Benutzer'
    });
  }
});

export default router;

