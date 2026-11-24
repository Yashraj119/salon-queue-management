export type Barber = {
  id: string;
  name: string;
  status: 'Available' | 'Busy' | 'On break';
  photoUrl: string;
};

export type Service = {
  id: number;
  nameEn: string;
  nameGu: string;
  durationMinutes: number;
  priceRupees: number;
};

export type HomeData = {
  salonName: string;
  salonOpen: boolean;
  onlineJoiningOpen: boolean;
  opensAt: string;
  closesAt: string;
  waitingCount: number;
  expectedWaitMinutes: number | null;
  workingBarberCount: number;
  barbers: Barber[];
};

export type CatalogData = HomeData & { services: Service[] };

export type QueueEntryResult = {
  duplicate: boolean;
  entry: {
    id: string;
    token: string;
    status: string;
    position: number | null;
  };
};

export type QueueEntryRequest = {
  name: string;
  phone: string;
  serviceIds: number[];
  barberId: string | null;
};

export type DisplayData = {
  salonName: string;
  barbers: Array<{
    id: string;
    name: string;
    status: 'Available' | 'Busy' | 'On break';
    photoUrl: string;
    current: { id: string; token: string; status: 'Called' | 'In chair'; calledAt: string | null } | null;
  }>;
  upNext: Array<{
    id: string;
    token: string;
    customerName: string;
    preferredBarberName: string | null;
    estimatedMinutes: number | null;
  }>;
  noWorkingBarbers: boolean;
};

export type CustomerQueueStatus = {
  id: string;
  token: string;
  status: 'Waiting' | 'Called' | 'In chair' | 'Done' | 'Cancelled' | 'No-show';
  preferredBarberName: string | null;
  assignedBarberName: string | null;
  preferredBarberOnBreak: boolean;
  services: string[];
};

import { apiUrl } from './config';

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly field?: string,
    readonly status?: number,
  ) {
    super(code);
  }
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(url), {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new ApiError('network_error');
  }

  const payload = await response.json().catch(() => ({})) as {
    error?: string;
    field?: string;
    code?: string;
  };
  if (!response.ok) {
    throw new ApiError(payload.code ?? payload.error ?? 'request_failed', payload.field, response.status);
  }
  return payload as T;
}

export const getHomeData = () => requestJson<HomeData>('/api/home');
export const getCatalogData = () => requestJson<CatalogData>('/api/catalog');
export const createQueueEntry = (entry: QueueEntryRequest) => requestJson<QueueEntryResult>('/api/queue-entries', {
  method: 'POST',
  body: JSON.stringify(entry),
});

export const getDisplayData = () => requestJson<DisplayData>('/api/display');
export const getCustomerQueueStatus = (entryId: string) => requestJson<CustomerQueueStatus>(
  `/api/queue-entries/${encodeURIComponent(entryId)}`,
);
