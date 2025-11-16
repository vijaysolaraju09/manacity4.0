import { createSelector } from '@reduxjs/toolkit';
import type { HistoryEntry } from '@/api/history';
import { formatINR } from '@/utils/currency';
import { formatLocaleDateTime } from '@/utils/date';
import type { EventSummary } from '@/types/events';
import type { ServiceRequest } from '@/types/services';
import type { RootState } from './index';
import type { Order } from './orders';
import { selectMyOrders } from './orders';
import { selectMyServiceRequests } from './serviceRequests';

const ORDER_FEEDBACK_STATUSES = new Set(['delivered', 'completed']);
const SERVICE_FEEDBACK_STATUSES = new Set(['completed', 'closed']);

const toIsoString = (value?: string | Date | null): string => {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const pluralize = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

const deriveOrderCode = (id: string) => (id || '').slice(-6).toUpperCase();

const mapOrderToHistoryEntry = (order: Order): HistoryEntry => {
  const itemCount = order.items.reduce((count, item) => count + (item.qty ?? 0), 0);
  const totalPaise = order.totals.grandPaise ?? 0;
  const descriptionParts = [formatINR(totalPaise), pluralize(itemCount, 'item')];
  const canFeedback = ORDER_FEEDBACK_STATUSES.has(order.status);

  return {
    id: `order:${order.id}`,
    type: 'order',
    referenceId: order.id,
    title: order.shop?.name || 'Order',
    description: descriptionParts.join(' • '),
    status: order.status,
    occurredAt: toIsoString(order.createdAt),
    completedAt: canFeedback ? toIsoString(order.updatedAt ?? order.createdAt) : null,
    canFeedback,
    feedback:
      typeof order.rating === 'number' || typeof order.review === 'string'
        ? { rating: order.rating ?? null, comment: order.review ?? null }
        : undefined,
    metadata: {
      totalPaise,
      itemCount,
      shopId: order.shop?.id ?? order.shop?._id ?? null,
      orderCode: deriveOrderCode(order.id),
    },
  };
};

const mapServiceRequestToHistoryEntry = (request: ServiceRequest): HistoryEntry => {
  const title = request.customName || request.service?.name || 'Service request';
  const when = [request.preferredDate, request.preferredTime].filter(Boolean).join(' at ');
  const parts = [when, request.location].filter(Boolean);
  const canFeedback = SERVICE_FEEDBACK_STATUSES.has(request.status);
  const requestId = request.id || request._id;

  return {
    id: `service_request:${requestId}`,
    type: 'service_request',
    referenceId: requestId,
    title,
    description: parts.join(' • ') || undefined,
    status: request.status,
    occurredAt: toIsoString(request.createdAt),
    completedAt: canFeedback ? toIsoString(request.updatedAt ?? request.createdAt) : null,
    canFeedback,
    feedback: request.feedback
      ? {
          rating: request.feedback.rating ?? null,
          comment: request.feedback.comment ?? null,
          updatedAt: request.feedback.updatedAt ?? undefined,
        }
      : undefined,
    metadata: {
      serviceId: request.serviceId,
      visibility: request.visibility,
    },
  };
};

const mapEventToHistoryEntry = (event: EventSummary): HistoryEntry | null => {
  const statusRaw = event.myRegistrationStatus ?? event.registrationStatus ?? event.registration?.status;
  if (!statusRaw) return null;
  const status = statusRaw.toLowerCase();
  const occurredAt = event.registration?.submittedAt ?? event.regOpenAt ?? event.startAt;
  const schedule = formatLocaleDateTime(event.startAt, { dateStyle: 'medium', timeStyle: 'short' });
  const descriptionParts = [schedule !== '—' ? schedule : null, event.venue].filter(
    (value): value is string => Boolean(value),
  );

  return {
    id: `event:${event._id}`,
    type: 'event',
    referenceId: event._id,
    title: event.title,
    description: descriptionParts.length > 0 ? descriptionParts.join(' • ') : event.shortDescription || undefined,
    status,
    occurredAt: toIsoString(occurredAt),
    completedAt: event.endAt ? toIsoString(event.endAt) : null,
    canFeedback: false,
    metadata: {
      eventId: event._id,
      eventStatus: event.status,
      startAt: event.startAt,
      endAt: event.endAt ?? null,
      visibility: event.visibility,
    },
  };
};

const selectEventsList = (state: RootState) => state.events.list.items ?? [];

export const selectOrderHistoryEntries = createSelector(selectMyOrders, (orders) =>
  orders.map(mapOrderToHistoryEntry),
);

export const selectServiceRequestHistoryEntries = createSelector(
  (state: RootState) => selectMyServiceRequests(state),
  (requests) => requests.map(mapServiceRequestToHistoryEntry),
);

export const selectEventHistoryEntries = createSelector(selectEventsList, (events) =>
  events
    .map(mapEventToHistoryEntry)
    .filter((entry): entry is HistoryEntry => entry !== null),
);

export const selectCombinedHistoryEntries = createSelector(
  selectOrderHistoryEntries,
  selectServiceRequestHistoryEntries,
  selectEventHistoryEntries,
  (orders, serviceRequests, eventEntries) =>
    [...orders, ...serviceRequests, ...eventEntries].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    ),
);
