import { http } from '@/lib/http';
import { toItems, toItem } from '@/lib/response';

export type HistoryEntryType = 'order' | 'service_request' | 'event';

export interface HistoryFeedback {
  rating?: number | null;
  comment?: string | null;
  updatedAt?: string;
}

export interface HistoryEntryMetadata {
  totalPaise?: number | null;
  itemCount?: number | null;
  orderCode?: string | null;
  shopId?: string | null;
  eventId?: string | null;
  eventStatus?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  serviceId?: string | null;
  visibility?: string | null;
}

export interface HistoryEntry {
  id: string;
  type: HistoryEntryType;
  referenceId: string;
  title: string;
  description?: string;
  status: string;
  occurredAt: string;
  completedAt?: string | null;
  canFeedback?: boolean;
  feedback?: HistoryFeedback;
  metadata?: HistoryEntryMetadata;
}

const toIsoString = (value: unknown): string => {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const normalizeHistoryEntry = (input: any): HistoryEntry => {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid history entry');
  }

  const id = String(input.id ?? input._id ?? `${Date.now()}`);
  const referenceId = String(input.referenceId ?? input.subjectId ?? id);
  const rawType = String(input.type ?? 'order').toLowerCase();
  const type: HistoryEntryType = ['service_request', 'event'].includes(rawType)
    ? (rawType as HistoryEntryType)
    : 'order';
  const title = typeof input.title === 'string' && input.title.trim() ? input.title.trim() : 'Activity';
  const description = typeof input.description === 'string' ? input.description : undefined;
  const status = typeof input.status === 'string' ? input.status : 'pending';
  const occurredAt = toIsoString(input.occurredAt);
  const completedAt = input.completedAt ? toIsoString(input.completedAt) : null;
  const canFeedback = Boolean(input.canFeedback);

  let feedback: HistoryFeedback | undefined;
  if (input.feedback && typeof input.feedback === 'object') {
    const ratingValue = input.feedback.rating;
    const commentValue = input.feedback.comment;
    feedback = {
      rating: typeof ratingValue === 'number' ? ratingValue : null,
      comment: typeof commentValue === 'string' ? commentValue : null,
      updatedAt: input.feedback.updatedAt ? toIsoString(input.feedback.updatedAt) : undefined,
    };
  }

  let metadata: HistoryEntryMetadata | undefined;
  if (input.metadata && typeof input.metadata === 'object') {
    const raw = input.metadata as Record<string, unknown>;
    metadata = {
      ...raw,
      totalPaise:
        raw.totalPaise !== undefined && raw.totalPaise !== null
          ? Number(raw.totalPaise)
          : raw.totalPaise === null
          ? null
          : undefined,
      itemCount:
        raw.itemCount !== undefined && raw.itemCount !== null
          ? Number(raw.itemCount)
          : raw.itemCount === null
          ? null
          : undefined,
    } as HistoryEntryMetadata;
  }

  return {
    id,
    type,
    referenceId,
    title,
    description,
    status,
    occurredAt,
    completedAt,
    canFeedback,
    feedback,
    metadata,
  };
};

export const fetchHistory = async (): Promise<HistoryEntry[]> => {
  const res = await http.get('/api/history');
  const raw = toItems(res);
  return raw.map(normalizeHistoryEntry);
};

export interface SubmitFeedbackPayload {
  subjectType: HistoryEntryType;
  subjectId: string;
  rating?: number;
  comment?: string;
}

export interface FeedbackResponse {
  id?: string;
  subjectType: HistoryEntryType;
  subjectId: string;
  rating?: number | null;
  comment?: string | null;
  updatedAt?: string;
}

const normalizeFeedback = (input: any): FeedbackResponse => {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid feedback payload');
  }
  const rawType = typeof input.subjectType === 'string' ? input.subjectType : 'order';
  const subjectType: HistoryEntryType = ['order', 'service_request', 'event'].includes(rawType)
    ? (rawType as HistoryEntryType)
    : 'order';

  return {
    id: input._id ? String(input._id) : undefined,
    subjectType,
    subjectId: String(input.subjectId ?? input.referenceId ?? ''),
    rating: typeof input.rating === 'number' ? input.rating : null,
    comment: typeof input.comment === 'string' ? input.comment : null,
    updatedAt: input.updatedAt ? toIsoString(input.updatedAt) : undefined,
  };
};

export const submitFeedback = async (
  payload: SubmitFeedbackPayload,
): Promise<FeedbackResponse> => {
  const res = await http.post('/api/feedback', payload);
  const raw = toItem(res);
  return normalizeFeedback(raw?.feedback ?? raw);
};
