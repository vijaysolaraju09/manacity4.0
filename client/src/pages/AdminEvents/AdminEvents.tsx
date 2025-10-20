import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
  publishEvent as apiPublishEvent,
  startEvent as apiStartEvent,
  completeEvent as apiCompleteEvent,
  cancelEvent as apiCancelEvent,
  type EventQueryParams,
} from '../../api/admin';
import DataTable, { type Column } from '../../components/admin/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import ErrorCard from '../../components/ui/ErrorCard';
import SkeletonList from '../../components/ui/SkeletonList';
import showToast from '../../components/ui/Toast';
import useDebounce from '../../hooks/useDebounce';
import useFocusTrap from '../../hooks/useFocusTrap';
import EventForm, { type EventFormErrors, type EventFormValues } from './EventForm';
import styles from './AdminEvents.module.scss';

interface EventItem {
  _id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  capacity: number;
  registered: number;
}

type LifecycleAction = 'publish' | 'start' | 'complete' | 'cancel';

const toEventItem = (raw: any): EventItem => ({
  _id: raw?._id ?? raw?.id ?? '',
  title: raw?.title ?? '',
  startAt: raw?.startAt ?? raw?.start_date ?? '',
  endAt: raw?.endAt ?? raw?.end_date ?? '',
  status: raw?.status ?? 'draft',
  capacity: Number.isFinite(Number(raw?.capacity ?? raw?.maxParticipants))
    ? Number(raw?.capacity ?? raw?.maxParticipants)
    : 0,
  registered: Number.isFinite(Number(raw?.registered ?? raw?.registeredCount))
    ? Number(raw?.registered ?? raw?.registeredCount)
    : 0,
});

type EventRow = EventItem & { actions?: string };

const emptyForm: EventFormValues = {
  title: '',
  startAt: '',
  endAt: '',
  capacity: '',
};

const toLocalDateTimeInput = (value?: string | Date | null) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toISO = (value: string) => new Date(value).toISOString();

const formatDateTime = (value: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const getRegistrationProgress = (event: EventItem) => {
  const capacity = Number.isFinite(event.capacity) ? event.capacity : 0;
  if (!capacity) return 0;
  const registered = Math.max(0, Math.min(capacity, event.registered ?? 0));
  return Math.round((registered / capacity) * 100);
};

const getLifecycleActions = (status?: string): LifecycleAction[] => {
  switch ((status ?? '').toLowerCase()) {
    case 'draft':
      return ['publish', 'cancel'];
    case 'published':
      return ['start', 'cancel'];
    case 'ongoing':
      return ['complete', 'cancel'];
    default:
      return [];
  }
};

const lifecycleLabels: Record<LifecycleAction, string> = {
  publish: 'Publish',
  start: 'Start',
  complete: 'Complete',
  cancel: 'Cancel',
};

const lifecycleConfirmations: Record<LifecycleAction, string> = {
  publish: 'Publish this event? It will become visible to participants.',
  start: 'Start this event? Registered participants will be notified.',
  complete: 'Mark this event as completed?',
  cancel: 'Cancel this event? Participants will be notified.',
};

const lifecycleSuccessMessages: Record<LifecycleAction, string> = {
  publish: 'Event published',
  start: 'Event started',
  complete: 'Event marked as completed',
  cancel: 'Event canceled',
};

const lifecycleErrorMessages: Record<LifecycleAction, string> = {
  publish: 'Failed to publish event',
  start: 'Failed to start event',
  complete: 'Failed to complete event',
  cancel: 'Failed to cancel event',
};

const normalizeStatus = (status?: string) => (status ?? '').toLowerCase();

const getStatusBadgeClass = (status?: string) => {
  switch (normalizeStatus(status)) {
    case 'published':
      return `${styles.statusChip} ${styles.badgePublished}`;
    case 'ongoing':
      return `${styles.statusChip} ${styles.badgeOngoing}`;
    case 'completed':
      return `${styles.statusChip} ${styles.badgeCompleted}`;
    case 'canceled':
      return `${styles.statusChip} ${styles.badgeCanceled}`;
    case 'upcoming':
      return `${styles.statusChip} ${styles.statusPending}`;
    default:
      return `${styles.statusChip} ${styles.badgeDraft}`;
  }
};

const getStatusLabel = (status?: string) => {
  const normalized = normalizeStatus(status);
  if (!normalized) return 'Draft';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const validateForm = (values: EventFormValues): EventFormErrors => {
  const errors: EventFormErrors = {};
  if (!values.title.trim()) {
    errors.title = 'Title is required';
  }

  const startDate = values.startAt ? new Date(values.startAt) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) {
    errors.startAt = 'Choose a valid start date';
  }

  const endDate = values.endAt ? new Date(values.endAt) : null;
  if (!endDate || Number.isNaN(endDate.getTime())) {
    errors.endAt = 'Choose a valid end date';
  }

  if (!errors.startAt && !errors.endAt && startDate && endDate && startDate >= endDate) {
    errors.endAt = 'End date/time must be after the start date/time';
  }

  const capacity = Number(values.capacity);
  if (!values.capacity.trim()) {
    errors.capacity = 'Capacity is required';
  } else if (!Number.isFinite(capacity) || capacity < 1) {
    errors.capacity = 'Capacity must be at least 1';
  }

  return errors;
};

const AdminEvents = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query.trim(), 400);
  const [sort, setSort] = useState('-startAt');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<EventItem | null>(null);
  const [detail, setDetail] = useState<EventItem | null>(null);
  const [form, setForm] = useState<EventFormValues>(emptyForm);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState<string | null>(null);

  const createRef = useRef<HTMLFormElement>(null);
  const editRef = useRef<HTMLFormElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  useFocusTrap(createRef, createOpen, () => {
    setCreateOpen(false);
    setForm(emptyForm);
    setErrors({});
  });
  useFocusTrap(editRef, !!edit, () => {
    setEdit(null);
    setForm(emptyForm);
    setErrors({});
  });
  useFocusTrap(detailRef, !!detail, () => setDetail(null));

  const resetForm = () => {
    setForm(emptyForm);
    setErrors({});
  };

  const applyEventUpdate = useCallback((updated: EventItem) => {
    setEvents((prev) => prev.map((event) => (event._id === updated._id ? updated : event)));
    setDetail((current) => (current && current._id === updated._id ? { ...current, ...updated } : current));
  }, []);

  const handleLifecycleAction = async (event: EventItem, action: LifecycleAction) => {
    if (!event?._id) return;
    const confirmMessage = lifecycleConfirmations[action];
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const handlers: Record<LifecycleAction, (id: string) => Promise<any>> = {
      publish: apiPublishEvent,
      start: apiStartEvent,
      complete: apiCompleteEvent,
      cancel: apiCancelEvent,
    };
    const actionKey = `${action}:${event._id}`;
    setLifecycleBusy(actionKey);
    try {
      const response = await handlers[action](event._id);
      if (response && typeof response === 'object') {
        const normalized = toEventItem(response);
        applyEventUpdate(normalized);
      }
      await load();
      showToast(lifecycleSuccessMessages[action], 'success');
    } catch (err) {
      console.error(err);
      showToast(lifecycleErrorMessages[action], 'error');
    } finally {
      setLifecycleBusy(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: EventQueryParams = {
        status: status || undefined,
        sort,
        page,
        pageSize,
        query: debouncedQuery || undefined,
      };
      const data = await fetchEvents(params);
      const items = Array.isArray(data.items) ? data.items.map(toEventItem) : [];
      setEvents(items);
      setTotal(typeof data.total === 'number' ? data.total : items.length);
    } catch {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [status, sort, page, pageSize, debouncedQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (detail && !events.some((event) => event._id === detail._id)) {
      setDetail(null);
    }
  }, [detail, events]);

  const summary = (() => {
    const base = {
      visible: events.length,
      upcoming: 0,
      ongoing: 0,
      past: 0,
      registered: 0,
      capacity: 0,
    };
    for (const event of events) {
      const statusKey = event.status as 'upcoming' | 'ongoing' | 'past';
      if (statusKey === 'upcoming') base.upcoming += 1;
      else if (statusKey === 'ongoing') base.ongoing += 1;
      else base.past += 1;
      base.registered += Number.isFinite(event.registered) ? event.registered : 0;
      base.capacity += Number.isFinite(event.capacity) ? event.capacity : 0;
    }
    const fillRate = base.capacity
      ? Math.min(100, Math.round((base.registered / base.capacity) * 100))
      : 0;
    return { ...base, fillRate };
  })();

  const hasEvents = (events ?? []).length > 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => {
    setEdit(null);
    setDetail(null);
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (event: EventItem) => {
    setCreateOpen(false);
    setDetail(null);
    setEdit(event);
    setForm({
      title: event.title,
      startAt: toLocalDateTimeInput(event.startAt),
      endAt: toLocalDateTimeInput(event.endAt),
      capacity: String(event.capacity ?? ''),
    });
    setErrors({});
  };

  const handleCreate = async (values: EventFormValues) => {
    const validationErrors = validateForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const payload = {
        title: values.title.trim(),
        startAt: toISO(values.startAt),
        endAt: toISO(values.endAt),
        capacity: Number(values.capacity),
      };
      const created = await apiCreateEvent(payload);
      if (!created || typeof created !== 'object') {
        await load();
      } else {
        const normalized = toEventItem(created);
        setEvents((prev) => {
          const rest = prev.filter((event) => event._id !== normalized._id);
          return [normalized, ...rest];
        });
        setTotal((t) => t + 1);
      }
      showToast('Event created', 'success');
      setCreateOpen(false);
      resetForm();
    } catch {
      showToast('Failed to create event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (values: EventFormValues) => {
    if (!edit) return;
    const validationErrors = validateForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const payload = {
        title: values.title.trim(),
        startAt: toISO(values.startAt),
        endAt: toISO(values.endAt),
        capacity: Number(values.capacity),
      };
      const updated = await apiUpdateEvent(edit._id, payload);
      if (!updated || typeof updated !== 'object') {
        await load();
      } else {
        const normalized = toEventItem(updated);
        setEvents((prev) => prev.map((event) => (event._id === edit._id ? normalized : event)));
      }
      showToast('Event updated', 'success');
      setEdit(null);
      resetForm();
    } catch {
      showToast('Failed to update event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title?: string) => {
    if (!window.confirm(`Delete ${title ?? 'this event'}?`)) return;
    try {
      await apiDeleteEvent(id);
      setEvents((prev) => prev.filter((event) => event._id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setDetail((current) => (current?._id === id ? null : current));
      showToast('Event deleted', 'success');
    } catch {
      showToast('Failed to delete event', 'error');
    }
  };

  const busyParts = lifecycleBusy?.split(':') ?? [];
  const busyAction = (busyParts[0] as LifecycleAction | undefined) ?? null;
  const busyEventId = busyParts[1] ?? null;

  const columns: Column<EventRow>[] = [
    {
      key: 'title',
      label: 'Event',
      render: (event) => (
        <div className={styles.eventTitle}>
          <span className={styles.eventTitleName}>{event.title}</span>
          <span className={styles.eventTitleMeta}>Starts {formatDateTime(event.startAt)}</span>
        </div>
      ),
    },
    {
      key: 'startAt',
      label: 'Schedule',
      render: (event) => (
        <div className={styles.eventSchedule}>
          <span>{formatDateTime(event.startAt)}</span>
          <span aria-hidden>→</span>
          <span>{formatDateTime(event.endAt)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (event) => (
        <span className={getStatusBadgeClass(event.status)}>
          {getStatusLabel(event.status)}
        </span>
      ),
    },
    {
      key: 'registered',
      label: 'Registrations',
      render: (event) => (
        <div className={styles.registrationCell}>
          <span className={styles.registrationValue}>
            {event.registered ?? 0} / {event.capacity ?? 0}
          </span>
          <div className={styles.registrationProgress} aria-hidden>
            <div style={{ width: `${getRegistrationProgress(event)}%` }} />
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (event) => (
        <>
          {getLifecycleActions(event.status).map((action) => {
            const key = `${action}:${event._id}`;
            const isBusy = lifecycleBusy === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleLifecycleAction(event, action)}
                disabled={isBusy}
              >
                {isBusy ? 'Processing…' : lifecycleLabels[action]}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setDetail(event)}
            disabled={busyEventId === event._id && busyAction !== null}
          >
            View
          </button>
          <button
            type="button"
            onClick={() => openEdit(event)}
            disabled={busyEventId === event._id && busyAction !== null}
          >
            {busyEventId === event._id && busyAction !== null ? 'Please wait…' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={() => handleDelete(event._id, event.title)}
            disabled={busyEventId === event._id && busyAction !== null}
          >
            Delete
          </button>
        </>
      ),
    },
  ];

  return (
    <div className={`${styles.page} space-y-6 px-4`}>
      <header className={styles.header}>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Events</h2>
          <p className={styles.subtitle}>
            Review upcoming activities, keep schedules accurate, and monitor registrations in real time.
          </p>
        </div>
        <div className={styles.summaryGrid} role="status" aria-live="polite">
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Visible</span>
            <span className={styles.summaryValue}>{summary.visible}</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Upcoming</span>
            <span className={styles.summaryValue}>{summary.upcoming}</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Ongoing</span>
            <span className={styles.summaryValue}>{summary.ongoing}</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Registrations</span>
            <span className={styles.summaryValue}>
              {summary.registered} / {summary.capacity || '—'}
            </span>
            <div className={styles.summaryProgress} aria-hidden>
              <div style={{ width: `${summary.fillRate}%` }} />
            </div>
          </article>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={`${styles.filters} flex-1`}>
          <input
            id="event-search"
            placeholder="Search title"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
            aria-label="Search events"
          />
          <select
            id="event-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="past">Past</option>
          </select>
          <select
            id="event-sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            aria-label="Sort events"
          >
            <option value="-startAt">Start: Newest first</option>
            <option value="startAt">Start: Oldest first</option>
            <option value="-endAt">End: Newest first</option>
            <option value="endAt">End: Oldest first</option>
          </select>
        </div>
        <button
          type="button"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={openCreate}
        >
          Add event
        </button>
      </div>

      {(() => {
        if (loading && !hasEvents) {
          return <SkeletonList count={pageSize} />;
        }
        if (error) {
          return (
            <ErrorCard
              message={error}
              onRetry={() => {
                void load();
              }}
            />
          );
        }
        if (!loading && !hasEvents) {
          return (
            <EmptyState
              title="No events yet"
              message="Create a new event or adjust your filters to see scheduled activities."
              ctaLabel="Refresh"
              onCtaClick={() => {
                void load();
              }}
            />
          );
        }
        return (
          <DataTable<EventRow>
            columns={columns}
            rows={(events ?? []) as EventRow[]}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            loading={loading}
            classNames={{
              tableWrap: styles.tableWrap,
              table: styles.table,
              th: styles.th,
              td: styles.td,
              row: styles.row,
              actions: styles.actions,
              empty: styles.td,
            }}
          />
        );
      })()}

      {hasEvents ? (
        <div className={styles.tableFooter}>
          <span>
            Showing page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700"
              onClick={() => setPage((prev) => (prev < totalPages ? prev + 1 : prev))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {createOpen && (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <EventForm
            ref={createRef}
            heading="Create event"
            values={form}
            errors={errors}
            saving={saving}
            submitLabel="Create"
            onChange={(changes) => setForm((prev) => ({ ...prev, ...changes }))}
            onSubmit={handleCreate}
            onCancel={() => {
              setCreateOpen(false);
              resetForm();
            }}
          />
        </div>
      )}

      {edit && (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <EventForm
            ref={editRef}
            heading="Edit event"
            values={form}
            errors={errors}
            saving={saving}
            submitLabel="Save changes"
            onChange={(changes) => setForm((prev) => ({ ...prev, ...changes }))}
            onSubmit={handleUpdate}
            onCancel={() => {
              setEdit(null);
              resetForm();
            }}
          />
        </div>
      )}

      {detail && (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <div
            ref={detailRef}
            className={`${styles.modalContent} ${styles.modalContentDetail}`}
          >
            <h3>{detail.title}</h3>
            <dl className={styles.eventDetail}>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={getStatusBadgeClass(detail.status)}>
                    {getStatusLabel(detail.status)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Starts</dt>
                <dd>{formatDateTime(detail.startAt)}</dd>
              </div>
              <div>
                <dt>Ends</dt>
                <dd>{formatDateTime(detail.endAt)}</dd>
              </div>
              <div>
                <dt>Registrations</dt>
                <dd>
                  {detail.registered ?? 0} / {detail.capacity ?? 0}
                </dd>
              </div>
            </dl>
            <div className={styles.detailActions}>
              {getLifecycleActions(detail.status).map((action) => {
                const key = `${action}:${detail._id}`;
                const isBusy = lifecycleBusy === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleLifecycleAction(detail, action)}
                    disabled={isBusy}
                  >
                    {isBusy ? 'Processing…' : lifecycleLabels[action]}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => openEdit(detail)}
                disabled={busyEventId === detail._id && busyAction !== null}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(detail._id, detail.title)}
                disabled={busyEventId === detail._id && busyAction !== null}
              >
                Delete
              </button>
              <button type="button" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;
