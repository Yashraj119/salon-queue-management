import { Router } from 'express';
import type { Response } from 'express';
import type { Server } from 'socket.io';
import { database, withTransaction } from '../db/database.js';
import { isValidStaffPin, requireStaffPin } from '../auth/staffPin.js';
import { activeQueueStatuses, canTransitionQueueStatus } from '../queue/queueRules.js';
import type { QueueStatus } from '../queue/queueRules.js';
import { createQueueEntryHandler, getPublicState } from './public.js';

type BarberRow = {
  id: string;
  name: string;
  status: 'Available' | 'Busy' | 'On break';
  is_on_duty: number;
  photo_url: string;
};

type EntryRow = {
  id: string;
  sequence: number;
  token: string;
  customer_name: string;
  phone: string;
  barber_id: string | null;
  called_barber_id: string | null;
  status: QueueStatus;
  created_at: string;
  called_at: string | null;
  started_at: string | null;
  preferred_barber_name: string | null;
  assigned_barber_name: string | null;
};

type ServiceRow = {
  service_name_en: string;
  duration_minutes: number;
};

type StaffEntry = {
  id: string;
  sequence: number;
  token: string;
  customerName: string;
  phone: string;
  status: QueueStatus;
  preferredBarberId: string | null;
  preferredBarberName: string | null;
  assignedBarberId: string | null;
  assignedBarberName: string | null;
  createdAt: string;
  calledAt: string | null;
  startedAt: string | null;
  waitingMinutes: number;
  services: Array<{ name: string; durationMinutes: number }>;
  totalServiceMinutes: number;
  noShowAvailable: boolean;
};

const activeStatusesSql = activeQueueStatuses.map(() => '?').join(', ');
const noShowGraceMilliseconds = 10 * 60 * 1000;

function getServicesForEntry(queueId: string) {
  return database.prepare(`
    SELECT service_name_en, duration_minutes
    FROM queue_entry_services WHERE queue_id = ? ORDER BY service_id
  `).all(queueId) as ServiceRow[];
}

function toStaffEntry(row: EntryRow, now: number): StaffEntry {
  const services = getServicesForEntry(row.id).map((service) => ({
    name: service.service_name_en,
    durationMinutes: service.duration_minutes,
  }));
  const calledAtMilliseconds = row.called_at ? Date.parse(row.called_at) : null;

  return {
    id: row.id,
    sequence: row.sequence,
    token: row.token,
    customerName: row.customer_name,
    phone: row.phone,
    status: row.status,
    preferredBarberId: row.barber_id,
    preferredBarberName: row.preferred_barber_name,
    assignedBarberId: row.called_barber_id,
    assignedBarberName: row.assigned_barber_name,
    createdAt: row.created_at,
    calledAt: row.called_at,
    startedAt: row.started_at,
    waitingMinutes: Math.max(0, Math.floor((now - Date.parse(row.created_at)) / 60_000)),
    services,
    totalServiceMinutes: services.reduce((sum, service) => sum + service.durationMinutes, 0),
    noShowAvailable: row.status === 'Called'
      && calledAtMilliseconds !== null
      && now - calledAtMilliseconds >= noShowGraceMilliseconds,
  };
}

function getActiveEntries(): EntryRow[] {
  return database.prepare(`
    SELECT q.id, q.sequence, q.token, q.customer_name, q.phone, q.barber_id,
      q.called_barber_id, q.status, q.created_at, q.called_at, q.started_at,
      preference.name AS preferred_barber_name,
      assigned.name AS assigned_barber_name
    FROM queue_entries q
    LEFT JOIN barbers preference ON preference.id = q.barber_id
    LEFT JOIN barbers assigned ON assigned.id = q.called_barber_id
    WHERE q.status IN (${activeStatusesSql})
    ORDER BY q.sequence ASC
  `).all(...activeQueueStatuses) as EntryRow[];
}

function sendStaffActionError(response: Response, status: number, error: string) {
  response.status(status).json({ error });
}

function getCallCandidate(barberId: string): EntryRow | undefined {
  return database.prepare(`
    SELECT q.id, q.sequence, q.token, q.customer_name, q.phone, q.barber_id,
      q.called_barber_id, q.status, q.created_at, q.called_at, q.started_at,
      preference.name AS preferred_barber_name,
      assigned.name AS assigned_barber_name
    FROM queue_entries q
    LEFT JOIN barbers preference ON preference.id = q.barber_id
    LEFT JOIN barbers assigned ON assigned.id = q.called_barber_id
    WHERE q.status = 'Waiting' AND (q.barber_id IS NULL OR q.barber_id = ?)
    ORDER BY q.sequence ASC
    LIMIT 1
  `).get(barberId) as EntryRow | undefined;
}

function getCurrentForBarber(barberId: string): EntryRow | undefined {
  return database.prepare(`
    SELECT q.id, q.sequence, q.token, q.customer_name, q.phone, q.barber_id,
      q.called_barber_id, q.status, q.created_at, q.called_at, q.started_at,
      preference.name AS preferred_barber_name,
      assigned.name AS assigned_barber_name
    FROM queue_entries q
    LEFT JOIN barbers preference ON preference.id = q.barber_id
    LEFT JOIN barbers assigned ON assigned.id = q.called_barber_id
    WHERE q.called_barber_id = ? AND q.status IN (${activeStatusesSql})
    ORDER BY q.sequence ASC
    LIMIT 1
  `).get(barberId, ...activeQueueStatuses) as EntryRow | undefined;
}

export function createStaffRouter(io: Server) {
  const router = Router();

  router.post('/unlock', (request, response) => {
    const pin = (request.body as { pin?: unknown } | undefined)?.pin;
    if (!isValidStaffPin(pin)) {
      return response.status(401).json({ error: 'staff_pin_invalid' });
    }
    response.json({ unlocked: true });
  });

  router.use(requireStaffPin);

  router.get('/reception', (_request, response) => {
    const now = Date.now();
    const activeEntries = getActiveEntries();
    const visibleQueue = activeEntries
      .filter((entry) => entry.status !== 'In chair')
      .map((entry) => toStaffEntry(entry, now));
    const barbers = database.prepare(`
      SELECT id, name, status, is_on_duty, photo_url
      FROM barbers WHERE is_on_duty = 1 ORDER BY name
    `).all() as BarberRow[];

    response.json({
      queueOpen: getPublicState().onlineJoiningOpen,
      waiting: visibleQueue,
      barbers: barbers.map((barber) => {
        const current = activeEntries.find((entry) => entry.called_barber_id === barber.id);
        const candidate = barber.status === 'On break' ? undefined : getCallCandidate(barber.id);
        const currentEntry = current ? toStaffEntry(current, now) : null;

        return {
          id: barber.id,
          name: barber.name,
          status: current?.status === 'In chair' ? 'Busy' : current?.status === 'Called' ? 'Called' : barber.status === 'On break' ? 'On break' : 'Available',
          photoUrl: barber.photo_url,
          current: currentEntry,
          canCallNext: barber.status !== 'On break' && !current && Boolean(candidate),
          unavailableReason: barber.status === 'On break' ? 'on_break' : current ? 'occupied' : candidate ? null : 'no_eligible_customer',
        };
      }),
    });
  });

  router.get('/barbers/:barberId', (request, response) => {
    const barberId = request.params.barberId;
    const barber = database.prepare(`
      SELECT id, name, status, is_on_duty, photo_url
      FROM barbers WHERE id = ? OR lower(name) = lower(?) LIMIT 1
    `).get(barberId, barberId) as BarberRow | undefined;
    if (!barber || barber.is_on_duty !== 1) return response.status(404).json({ error: 'barber_unavailable' });

    const now = Date.now();
    const current = getCurrentForBarber(barber.id);
    const next = barber.status === 'On break' ? undefined : getCallCandidate(barber.id);
    response.json({
      barber: {
        id: barber.id,
        name: barber.name,
        status: current?.status === 'In chair' ? 'Busy' : barber.status,
        photoUrl: barber.photo_url,
      },
      current: current ? toStaffEntry(current, now) : null,
      next: next ? toStaffEntry(next, now) : null,
      canTakeBreak: !current,
    });
  });

  router.post('/barbers/:barberId/call-next', (request, response) => {
    const barberId = request.params.barberId;
    const result = withTransaction(() => {
      const barber = database.prepare(`
        SELECT id, status, is_on_duty FROM barbers WHERE id = ?
      `).get(barberId) as Pick<BarberRow, 'id' | 'status' | 'is_on_duty'> | undefined;

      if (!barber || barber.is_on_duty !== 1) return { error: 'barber_unavailable', status: 404 };
      if (barber.status === 'On break') return { error: 'barber_on_break', status: 409 };
      if (getCurrentForBarber(barberId)) return { error: 'barber_occupied', status: 409 };

      const candidate = getCallCandidate(barberId);
      if (!candidate) return { error: 'no_eligible_customer', status: 409 };
      if (!canTransitionQueueStatus('Waiting', 'Called')) return { error: 'invalid_transition', status: 409 };

      const calledAt = new Date().toISOString();
      database.prepare(`
        UPDATE queue_entries
        SET status = 'Called', called_barber_id = ?, called_at = ?
        WHERE id = ? AND status = 'Waiting'
      `).run(barberId, calledAt, candidate.id);

      return { entryId: candidate.id };
    });

    if ('error' in result) return sendStaffActionError(response, result.status ?? 409, result.error ?? 'call_failed');
    io.emit('queue:changed');
    response.json({ called: true, entryId: result.entryId });
  });

  router.post('/barbers/:barberId/start', (request, response) => {
    const barberId = request.params.barberId;
    const result = withTransaction(() => {
      const entry = getCurrentForBarber(barberId);
      if (!entry || entry.status !== 'Called') return { error: 'start_not_allowed' as const };
      if (!canTransitionQueueStatus(entry.status, 'In chair')) return { error: 'invalid_transition' as const };
      database.prepare(`
        UPDATE queue_entries SET status = 'In chair', started_at = ?
        WHERE id = ? AND called_barber_id = ? AND status = 'Called'
      `).run(new Date().toISOString(), entry.id, barberId);
      database.prepare("UPDATE barbers SET status = 'Busy' WHERE id = ?").run(barberId);
      return { updated: true } as const;
    });
    if ('error' in result) return sendStaffActionError(response, 409, result.error ?? 'start_not_allowed');
    io.emit('queue:changed');
    response.json(result);
  });

  router.post('/barbers/:barberId/done', (request, response) => {
    const barberId = request.params.barberId;
    const result = withTransaction(() => {
      const entry = getCurrentForBarber(barberId);
      if (!entry || entry.status !== 'In chair') return { error: 'done_not_allowed' as const };
      if (!canTransitionQueueStatus(entry.status, 'Done')) return { error: 'invalid_transition' as const };
      database.prepare("UPDATE queue_entries SET status = 'Done' WHERE id = ? AND called_barber_id = ? AND status = 'In chair'").run(entry.id, barberId);
      database.prepare("UPDATE barbers SET status = 'Available' WHERE id = ?").run(barberId);
      return { updated: true } as const;
    });
    if ('error' in result) return sendStaffActionError(response, 409, result.error ?? 'done_not_allowed');
    io.emit('queue:changed');
    response.json(result);
  });

  router.post('/barbers/:barberId/availability', (request, response) => {
    const barberId = request.params.barberId;
    const status = (request.body as { status?: unknown } | undefined)?.status;
    if (status !== 'Available' && status !== 'On break') {
      return sendStaffActionError(response, 400, 'invalid_availability');
    }
    const result = withTransaction(() => {
      const barber = database.prepare('SELECT id, is_on_duty FROM barbers WHERE id = ?').get(barberId) as Pick<BarberRow, 'id' | 'is_on_duty'> | undefined;
      if (!barber || barber.is_on_duty !== 1) return { error: 'barber_unavailable' as const, status: 404 };
      if (getCurrentForBarber(barberId)) return { error: 'barber_occupied' as const, status: 409 };
      database.prepare('UPDATE barbers SET status = ? WHERE id = ?').run(status, barberId);
      return { updated: true } as const;
    });
    if ('error' in result) return sendStaffActionError(response, result.status ?? 409, result.error ?? 'availability_update_failed');
    io.emit('queue:changed');
    response.json(result);
  });

  router.post('/queue-entries/:entryId/no-show', (request, response) => {
    const entryId = request.params.entryId;
    const entry = database.prepare(`
      SELECT id, status, called_at FROM queue_entries WHERE id = ?
    `).get(entryId) as { id: string; status: QueueStatus; called_at: string | null } | undefined;

    if (!entry || entry.status !== 'Called' || !entry.called_at) {
      return sendStaffActionError(response, 409, 'no_show_not_allowed');
    }
    if (Date.now() - Date.parse(entry.called_at) < noShowGraceMilliseconds) {
      return sendStaffActionError(response, 409, 'no_show_too_early');
    }
    if (!canTransitionQueueStatus('Called', 'No-show')) {
      return sendStaffActionError(response, 409, 'invalid_transition');
    }

    database.prepare("UPDATE queue_entries SET status = 'No-show' WHERE id = ? AND status = 'Called'").run(entryId);
    io.emit('queue:changed');
    response.json({ updated: true });
  });

  router.post('/queue-entries/:entryId/cancel', (request, response) => {
    const entryId = request.params.entryId;
    const entry = database.prepare('SELECT id, status FROM queue_entries WHERE id = ?').get(entryId) as { id: string; status: QueueStatus } | undefined;
    if (!entry || !canTransitionQueueStatus(entry.status, 'Cancelled')) {
      return sendStaffActionError(response, 409, 'cancel_not_allowed');
    }

    database.prepare("UPDATE queue_entries SET status = 'Cancelled' WHERE id = ? AND status = 'Waiting'").run(entryId);
    io.emit('queue:changed');
    response.json({ updated: true });
  });

  router.post('/walk-ins', createQueueEntryHandler(io, true));

  return router;
}
