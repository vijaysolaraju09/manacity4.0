import { paths } from '@/routes/paths';
import type { Notif } from '@/store/notifs';

export type NotificationTarget =
  | { kind: 'internal'; path: string }
  | { kind: 'external'; url: string };

const toIdString = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if ('_id' in (value as Record<string, unknown>) && (value as Record<string, unknown>)._id) {
      const raw = (value as Record<string, unknown>)._id;
      return typeof raw === 'string' ? raw : raw ? String(raw) : null;
    }
    if ('id' in (value as Record<string, unknown>) && (value as Record<string, unknown>).id) {
      const raw = (value as Record<string, unknown>).id;
      return typeof raw === 'string' ? raw : raw ? String(raw) : null;
    }
    const stringifier = (value as { toString?: () => string }).toString;
    if (typeof stringifier === 'function') {
      const str = stringifier.call(value as { toString?: () => string });
      return str ? str : null;
    }
  }
  return null;
};

const toLinkTarget = (link?: string | null): NotificationTarget | null => {
  if (!link) return null;
  if (/^https?:\/\//iu.test(link)) {
    return { kind: 'external', url: link };
  }
  const normalized = link.startsWith('/') ? link : `/${link}`;
  return { kind: 'internal', path: normalized };
};

const resolveOrderPath = (id: string | null): NotificationTarget | null => {
  if (!id) return null;
  return { kind: 'internal', path: paths.orders.detail(id) };
};

const resolveServiceRequestPath = (id: string | null): NotificationTarget | null => {
  if (!id) return null;
  return { kind: 'internal', path: paths.serviceRequests.detail(id) };
};

const resolveEventPath = (id: string | null): NotificationTarget | null => {
  if (!id) return null;
  return { kind: 'internal', path: paths.events.detail(id) };
};

const resolveEventRegistrationPath = (
  id: string | null,
  link: string | null,
): NotificationTarget | null => {
  if (link && /\/register/u.test(link)) {
    return toLinkTarget(link);
  }
  if (!id) return null;
  return { kind: 'internal', path: paths.events.register(id) };
};

const coalesceId = (values: Array<unknown>): string | null => {
  for (const value of values) {
    const id = toIdString(value);
    if (id) return id;
  }
  return null;
};

export const goToNotificationTarget = (notification: Notif): NotificationTarget | null => {
  if (!notification) return null;
  const payload = notification.payload ?? {};
  const metadata = notification.metadata ?? {};
  const fallbackLink =
    notification.resourceLink || notification.targetLink || notification.redirectUrl || null;
  const targetType =
    notification.resourceType || notification.targetType || notification.entityType || notification.type;

  if (targetType === 'order') {
    const id = coalesceId([
      notification.resourceId,
      notification.targetId,
      notification.entityId,
      (metadata as Record<string, unknown>).orderId,
      (payload as Record<string, unknown>).orderId,
    ]);
    return resolveOrderPath(id) ?? toLinkTarget(fallbackLink);
  }

  if (targetType === 'serviceRequest' || targetType === 'service_request') {
    const id = coalesceId([
      notification.resourceId,
      notification.targetId,
      notification.entityId,
      (metadata as Record<string, unknown>).requestId,
      (payload as Record<string, unknown>).requestId,
    ]);
    return resolveServiceRequestPath(id) ?? toLinkTarget(fallbackLink);
  }

  if (targetType === 'event') {
    const id = coalesceId([
      notification.resourceId,
      notification.targetId,
      notification.entityId,
      (metadata as Record<string, unknown>).eventId,
      (payload as Record<string, unknown>).eventId,
    ]);
    const registrationId =
      toIdString((metadata as Record<string, unknown>).registrationId) ||
      toIdString((payload as Record<string, unknown>).registrationId);
    if (registrationId) {
      return resolveEventRegistrationPath(id, fallbackLink);
    }
    return resolveEventPath(id) ?? toLinkTarget(fallbackLink);
  }

  if (targetType === 'announcement') {
    return toLinkTarget(fallbackLink) ?? { kind: 'internal', path: '/announcements' };
  }

  if (targetType === 'system') {
    const linkFromPayload =
      (payload as Record<string, unknown>).link || (metadata as Record<string, unknown>).link;
    const systemLink = toLinkTarget(typeof linkFromPayload === 'string' ? linkFromPayload : fallbackLink);
    if (systemLink) return systemLink;
  }

  return toLinkTarget(fallbackLink);
};
