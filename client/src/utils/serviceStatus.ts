import type { ServiceRequestStatus } from '@/types/services';

const statusMap: Record<string, ServiceRequestStatus> = {
  pending: 'pending',
  awaitingapproval: 'awaiting_approval',
  awaiting_approval: 'awaiting_approval',
  accepted: 'accepted',
  assigned: 'accepted',
  inprogress: 'in_progress',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  rejected: 'rejected',
};

export const normalizeServiceStatus = (value: unknown): ServiceRequestStatus => {
  if (typeof value !== 'string') return 'pending';
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (!normalized) return 'pending';
  const compact = normalized.replace(/[_\s-]/g, '');
  return statusMap[compact] ?? statusMap[normalized] ?? 'pending';
};

export const formatServiceStatus = (value: unknown): string =>
  normalizeServiceStatus(value)
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
