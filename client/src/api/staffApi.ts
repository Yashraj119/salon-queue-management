import { apiUrl } from './config';
import type { QueueEntryRequest, QueueEntryResult } from './publicApi';

export type StaffQueueEntry = {
  id: string;
  sequence: number;
  token: string;
  customerName: string;
  phone: string;
  status: 'Waiting' | 'Called' | 'In chair';
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

export type StaffBarberCard = {
  id: string;
  name: string;
  status: 'Available' | 'Busy' | 'Called' | 'On break';
  photoUrl: string;
  current: StaffQueueEntry | null;
  canCallNext: boolean;
  unavailableReason: 'on_break' | 'occupied' | 'no_eligible_customer' | null;
};

export type ReceptionData = {
  queueOpen: boolean;
  waiting: StaffQueueEntry[];
  barbers: StaffBarberCard[];
};

export class StaffApiError extends Error {
  constructor(readonly code: string, readonly status?: number) {
    super(code);
  }
}

async function staffRequest<T>(pin: string, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Staff-Pin': pin,
        ...init?.headers,
      },
    });
  } catch {
    throw new StaffApiError('network_error');
  }

  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new StaffApiError(payload.error ?? 'request_failed', response.status);
  return payload as T;
}

export const getReceptionData = (pin: string) => staffRequest<ReceptionData>(pin, '/api/staff/reception');

export const callNextForBarber = (pin: string, barberId: string) => staffRequest<{ called: boolean; entryId: string }>(
  pin,
  `/api/staff/barbers/${encodeURIComponent(barberId)}/call-next`,
  { method: 'POST' },
);

export const markNoShow = (pin: string, entryId: string) => staffRequest<{ updated: boolean }>(
  pin,
  `/api/staff/queue-entries/${encodeURIComponent(entryId)}/no-show`,
  { method: 'POST' },
);

export const cancelQueueEntry = (pin: string, entryId: string) => staffRequest<{ updated: boolean }>(
  pin,
  `/api/staff/queue-entries/${encodeURIComponent(entryId)}/cancel`,
  { method: 'POST' },
);

export const addWalkIn = (pin: string, entry: QueueEntryRequest) => staffRequest<QueueEntryResult>(
  pin,
  '/api/staff/walk-ins',
  { method: 'POST', body: JSON.stringify(entry) },
);
