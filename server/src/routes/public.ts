import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import type { Server } from 'socket.io';
import { database, withTransaction } from '../db/database.js';
import { activeQueueStatuses } from '../queue/queueRules.js';
import type { QueueStatus } from '../queue/queueRules.js';

type SettingsRow = {
  salon_name: string;
  opening_minute: number;
  closing_minute: number;
  online_queue_open: number;
};

type BarberRow = {
  id: string;
  name: string;
  status: 'Available' | 'Busy' | 'On break';
  is_on_duty: number;
  photo_url: string;
};

type ServiceRow = {
  id: number;
  name_en: string;
  name_gu: string;
  duration_minutes: number;
  price_rupees: number;
};

type QueueRow = {
  id: string;
  sequence: number;
  token: string;
  status: QueueStatus;
  customer_name: string;
  created_at: string;
};

type DisplayQueueRow = {
  id: string;
  token: string;
  barber_id: string | null;
  status: QueueStatus;
  called_at: string | null;
};

function getCurrentMinuteInIndia(): number {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function formatClock(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hour12 = hour % 12 || 12;
  const minuteText = minute.toString().padStart(2, '0');
  const meridiem = hour < 12 ? 'AM' : 'PM';
  return `${hour12}:${minuteText} ${meridiem}`;
}

export function getPublicState() {
  const settings = database.prepare('SELECT * FROM salon_settings WHERE id = 1').get() as SettingsRow;
  const barbers = database.prepare(
    'SELECT id, name, status, is_on_duty, photo_url FROM barbers WHERE is_on_duty = 1 ORDER BY name',
  ).all() as BarberRow[];
  const currentMinute = getCurrentMinuteInIndia();
  const salonOpen = currentMinute >= settings.opening_minute && currentMinute < settings.closing_minute;
  const onlineJoiningOpen = Boolean(settings.online_queue_open)
    && salonOpen
    && currentMinute < settings.closing_minute - 30;
  const waitingCount = (database.prepare(
    "SELECT COUNT(*) AS count FROM queue_entries WHERE status = 'Waiting'",
  ).get() as { count: number }).count;
  const activeServiceMinutes = (database.prepare(`
    SELECT COALESCE(SUM(qs.duration_minutes), 0) AS minutes
    FROM queue_entry_services qs
    INNER JOIN queue_entries q ON q.id = qs.queue_id
    WHERE q.status IN (${activeQueueStatuses.map(() => '?').join(', ')})
  `).get(...activeQueueStatuses) as { minutes: number }).minutes;
  const workingBarberCount = barbers.filter((barber) => barber.status !== 'On break').length;
  const expectedWaitMinutes = workingBarberCount > 0
    ? Math.max(0, Math.ceil(activeServiceMinutes / workingBarberCount))
    : null;

  return {
    salonName: settings.salon_name,
    salonOpen,
    onlineJoiningOpen,
    opensAt: formatClock(settings.opening_minute),
    closesAt: formatClock(settings.closing_minute),
    waitingCount,
    expectedWaitMinutes,
    workingBarberCount,
    barbers: barbers.map((barber) => ({
      id: barber.id,
      name: barber.name,
      status: barber.status,
      photoUrl: barber.photo_url,
    })),
  };
}

function getPosition(entry: Pick<QueueRow, 'sequence' | 'status'>): number | null {
  if (entry.status !== 'Waiting') return null;
  const ahead = (database.prepare(`
    SELECT COUNT(*) AS count FROM queue_entries
    WHERE status = 'Waiting' AND sequence < ?
  `).get(entry.sequence) as { count: number }).count;
  return ahead + 1;
}

function sendValidationError(response: Response, field: string, code: string) {
  response.status(400).json({ error: 'validation_error', field, code });
}

export function createQueueEntryHandler(io: Server, allowWalkInsWhenClosed = false): RequestHandler {
  return (request: Request, response: Response) => {
    const body = (request.body && typeof request.body === 'object' ? request.body : {}) as {
      name?: unknown;
      phone?: unknown;
      serviceIds?: unknown;
      barberId?: unknown;
    };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

    if (name.length < 2 || name.length > 80) {
      return sendValidationError(response, 'name', 'invalid_length');
    }
    if (!/^\d{10}$/.test(phone)) {
      return sendValidationError(response, 'phone', 'invalid_format');
    }
    if (!Array.isArray(body.serviceIds) || body.serviceIds.length === 0) {
      return sendValidationError(response, 'serviceIds', 'required');
    }
    if (body.serviceIds.length > 3) {
      return sendValidationError(response, 'serviceIds', 'selection_limit');
    }
    const serviceIds = body.serviceIds.map((id) => Number(id));
    if (serviceIds.some((id) => !Number.isInteger(id)) || new Set(serviceIds).size !== serviceIds.length) {
      return sendValidationError(response, 'serviceIds', 'invalid_selection');
    }
    const barberId = body.barberId === null ? null : typeof body.barberId === 'string' ? body.barberId : undefined;
    if (barberId === undefined) {
      return sendValidationError(response, 'barberId', 'required');
    }

    const existing = database.prepare(`
      SELECT id, sequence, token, status, customer_name, created_at
      FROM queue_entries
      WHERE phone = ? AND status IN (${activeQueueStatuses.map(() => '?').join(', ')})
      ORDER BY sequence DESC LIMIT 1
    `).get(phone, ...activeQueueStatuses) as QueueRow | undefined;
    if (existing) {
      return response.json({
        duplicate: true,
        entry: {
          id: existing.id,
          token: existing.token,
          status: existing.status,
          position: getPosition(existing),
        },
      });
    }

    const publicState = getPublicState();
    if (!allowWalkInsWhenClosed && !publicState.onlineJoiningOpen) {
      return response.status(403).json({ error: 'queue_closed' });
    }
    if (!allowWalkInsWhenClosed && publicState.workingBarberCount === 0) {
      return response.status(409).json({ error: 'no_barber_available' });
    }
    if (barberId !== null && !publicState.barbers.some((barber) => barber.id === barberId)) {
      return sendValidationError(response, 'barberId', 'unavailable');
    }

    const placeholders = serviceIds.map(() => '?').join(', ');
    const services = database.prepare(`
      SELECT id, name_en, name_gu, duration_minutes, price_rupees
      FROM services WHERE is_available = 1 AND id IN (${placeholders})
    `).all(...serviceIds) as ServiceRow[];
    if (services.length !== serviceIds.length) {
      return sendValidationError(response, 'serviceIds', 'unavailable');
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const created = withTransaction(() => {
      const inserted = database.prepare(`
        INSERT INTO queue_entries (id, customer_name, phone, barber_id, status, created_at)
        VALUES (?, ?, ?, ?, 'Waiting', ?)
      `).run(id, name, phone, barberId, createdAt);
      const sequence = Number(inserted.lastInsertRowid);
      const token = `S-${sequence}`;
      database.prepare('UPDATE queue_entries SET token = ? WHERE id = ?').run(token, id);
      const saveService = database.prepare(`
        INSERT INTO queue_entry_services
          (queue_id, service_id, service_name_en, service_name_gu, duration_minutes, price_rupees)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      services.forEach((service) => saveService.run(
        id,
        service.id,
        service.name_en,
        service.name_gu,
        service.duration_minutes,
        service.price_rupees,
      ));
      return { sequence, token };
    });
    io.emit('queue:changed');
    response.status(201).json({
      duplicate: false,
      entry: { id, token: created.token, status: 'Waiting', position: getPosition({ sequence: created.sequence, status: 'Waiting' }) },
    });
  };
}

export function createPublicRouter(io: Server) {
  const router = Router();

  router.get('/home', (_request, response) => {
    response.json(getPublicState());
  });

  router.get('/catalog', (_request, response) => {
    const services = database.prepare(`
      SELECT id, name_en, name_gu, duration_minutes, price_rupees
      FROM services WHERE is_available = 1 ORDER BY id
    `).all() as ServiceRow[];
    response.json({ ...getPublicState(), services: services.map((service) => ({
      id: service.id,
      nameEn: service.name_en,
      nameGu: service.name_gu,
      durationMinutes: service.duration_minutes,
      priceRupees: service.price_rupees,
    })) });
  });

  router.get('/display', (_request, response) => {
    const barbers = database.prepare(`
      SELECT b.id, b.name, b.status, b.photo_url,
        q.id AS current_id, q.token AS current_token, q.status AS current_status,
        q.called_at AS current_called_at
      FROM barbers b
      LEFT JOIN queue_entries q ON q.called_barber_id = b.id AND q.status IN ('Called', 'In chair')
      WHERE b.is_on_duty = 1
      ORDER BY b.name
    `).all() as Array<{
      id: string;
      name: string;
      status: BarberRow['status'];
      photo_url: string;
      current_id: string | null;
      current_token: string | null;
      current_status: 'Called' | 'In chair' | null;
      current_called_at: string | null;
    }>;
    const waiting = database.prepare(`
      SELECT q.id, q.token, q.barber_id, q.status, q.called_at
      FROM queue_entries q WHERE q.status = 'Waiting' ORDER BY q.sequence
    `).all() as DisplayQueueRow[];
    const serviceDurations = database.prepare(`
      SELECT queue_id, SUM(duration_minutes) AS minutes
      FROM queue_entry_services GROUP BY queue_id
    `).all() as Array<{ queue_id: string; minutes: number }>;
    const durations = new Map(serviceDurations.map((row) => [row.queue_id, row.minutes]));
    const workingBarberCount = barbers.filter((barber) => barber.status !== 'On break').length;
    const activeMinutes = (database.prepare(`
      SELECT COALESCE(SUM(qs.duration_minutes), 0) AS minutes
      FROM queue_entry_services qs
      INNER JOIN queue_entries q ON q.id = qs.queue_id
      WHERE q.status IN ('Called', 'In chair')
    `).get() as { minutes: number }).minutes;
    let minutesAhead = activeMinutes;
    const upNext = waiting.slice(0, 5).map((entry) => {
      const estimatedMinutes = workingBarberCount > 0 ? Math.ceil(minutesAhead / workingBarberCount) : null;
      minutesAhead += durations.get(entry.id) ?? 0;
      const preferredBarber = entry.barber_id
        ? barbers.find((barber) => barber.id === entry.barber_id)?.name ?? null
        : null;
      return {
        id: entry.id,
        token: entry.token,
        preferredBarberName: preferredBarber,
        estimatedMinutes,
      };
    });

    response.json({
      salonName: getPublicState().salonName,
      barbers: barbers.map((barber) => ({
        id: barber.id,
        name: barber.name,
        status: barber.current_id ? 'Busy' : barber.status,
        photoUrl: barber.photo_url,
        current: barber.current_id && barber.current_token ? {
          id: barber.current_id,
          token: barber.current_token,
          status: barber.current_status,
          calledAt: barber.current_called_at,
        } : null,
      })),
      upNext,
      noWorkingBarbers: workingBarberCount === 0,
    });
  });

  router.get('/queue-entries/:entryId', (request, response) => {
    const entry = database.prepare(`
      SELECT q.id, q.token, q.status, q.barber_id, q.called_barber_id,
        preference.name AS preferred_barber_name, assigned.name AS assigned_barber_name,
        preference.status AS preferred_barber_status
      FROM queue_entries q
      LEFT JOIN barbers preference ON preference.id = q.barber_id
      LEFT JOIN barbers assigned ON assigned.id = q.called_barber_id
      WHERE q.id = ? LIMIT 1
    `).get(request.params.entryId) as {
      id: string;
      token: string;
      status: QueueStatus;
      barber_id: string | null;
      called_barber_id: string | null;
      preferred_barber_name: string | null;
      assigned_barber_name: string | null;
      preferred_barber_status: BarberRow['status'] | null;
    } | undefined;
    if (!entry) return response.status(404).json({ error: 'queue_entry_not_found' });

    const services = database.prepare(`
      SELECT service_name_en FROM queue_entry_services WHERE queue_id = ? ORDER BY service_id
    `).all(entry.id) as Array<{ service_name_en: string }>;
    response.json({
      id: entry.id,
      token: entry.token,
      status: entry.status,
      preferredBarberName: entry.preferred_barber_name,
      assignedBarberName: entry.assigned_barber_name,
      preferredBarberOnBreak: entry.barber_id !== null && entry.preferred_barber_status === 'On break',
      services: services.map((service) => service.service_name_en),
    });
  });

  router.post('/queue-entries', createQueueEntryHandler(io));

  return router;
}
