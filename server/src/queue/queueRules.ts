export const queueStatuses = ['Waiting', 'Called', 'In chair', 'Done', 'Cancelled', 'No-show'] as const;

export type QueueStatus = (typeof queueStatuses)[number];

const allowedTransitions: Record<QueueStatus, readonly QueueStatus[]> = {
  Waiting: ['Called', 'Cancelled'],
  Called: ['In chair', 'No-show'],
  'In chair': ['Done'],
  Done: [],
  Cancelled: [],
  'No-show': [],
};

export function canTransitionQueueStatus(from: QueueStatus, to: QueueStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function isActiveQueueStatus(status: QueueStatus): boolean {
  return status === 'Waiting' || status === 'Called' || status === 'In chair';
}
