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
    response = await fetch(url, {
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
