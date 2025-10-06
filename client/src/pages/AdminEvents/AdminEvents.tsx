import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
  type EventQueryParams,
} from '../../api/admin';
import DataTable, { type Column } from '../../components/admin/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import showToast from '../../components/ui/Toast';
import useDebounce from '../../hooks/useDebounce';
import useFocusTrap from '../../hooks/useFocusTrap';
import EventForm, { type EventFormErrors, type EventFormValues } from './EventForm';
import './AdminEvents.scss';

interface EventItem {
  _id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  capacity: number;
  registered: number;
}

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: EventQueryParams = {
        status: status || undefined,
        sort,
        page,
        pageSize,
        query: debouncedQuery || undefined,
      };
      const data = await fetchEvents(params);
      const items = Array.isArray(data.items) ? (data.items as EventItem[]) : [];
      setEvents(items);
      setTotal(typeof data.total === 'number' ? data.total : items.length);
    } catch {
      showToast('Failed to load events', 'error');
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
        setEvents((prev) => [created as EventItem, ...prev]);
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
        setEvents((prev) => prev.map((event) => (event._id === edit._id ? (updated as EventItem) : event)));
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

  const columns: Column<EventRow>[] = [
    {
      key: 'title',
      label: 'Event',
      render: (event) => (
        <div className="event-title">
          <span className="event-title__name">{event.title}</span>
          <span className="event-title__meta">Starts {formatDateTime(event.startAt)}</span>
        </div>
      ),
    },
    {
      key: 'startAt',
      label: 'Schedule',
      render: (event) => (
        <div className="event-schedule">
          <span>{formatDateTime(event.startAt)}</span>
          <span aria-hidden className="event-schedule__arrow">→</span>
          <span>{formatDateTime(event.endAt)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (event) => <StatusChip status={(event.status as any) ?? 'upcoming'} />,
    },
    {
      key: 'registered',
      label: 'Registrations',
      render: (event) => (
        <div className="registration-cell">
          <span className="registration-cell__value">
            {event.registered ?? 0} / {event.capacity ?? 0}
          </span>
          <div className="registration-progress" aria-hidden>
            <div
              className="registration-progress__bar"
              style={{ width: `${getRegistrationProgress(event)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (event) => (
        <div className="actions" data-label="Actions">
          <button type="button" onClick={() => setDetail(event)}>
            View
          </button>
          <button type="button" onClick={() => openEdit(event)}>
            Edit
          </button>
          <button type="button" onClick={() => handleDelete(event._id, event.title)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-events">
      <header className="admin-events__header">
        <div>
          <h2>Events</h2>
          <p className="admin-events__subtitle">
            Review upcoming activities, keep schedules accurate, and monitor registrations in real time.
          </p>
        </div>
        <div className="summary-grid" role="status" aria-live="polite">
          <article className="summary-card">
            <h3>Visible</h3>
            <p>{summary.visible}</p>
          </article>
          <article className="summary-card">
            <h3>Upcoming</h3>
            <p>{summary.upcoming}</p>
          </article>
          <article className="summary-card">
            <h3>Ongoing</h3>
            <p>{summary.ongoing}</p>
          </article>
          <article className="summary-card">
            <h3>Registrations</h3>
            <p>
              {summary.registered} / {summary.capacity || '—'}
            </p>
            <div className="summary-card__progress" aria-hidden>
              <div style={{ width: `${summary.fillRate}%` }} />
            </div>
          </article>
        </div>
      </header>

      <div className="admin-events__filters">
        <div className="filters__group">
          <label htmlFor="event-search" className="sr-only">
            Search events
          </label>
          <input
            id="event-search"
            className="filters__search"
            placeholder="Search title"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="filters__group">
          <label htmlFor="event-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="event-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="past">Past</option>
          </select>
        </div>
        <div className="filters__group">
          <label htmlFor="event-sort" className="sr-only">
            Sort events
          </label>
          <select
            id="event-sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="-startAt">Start: Newest first</option>
            <option value="startAt">Start: Oldest first</option>
            <option value="-endAt">End: Newest first</option>
            <option value="endAt">End: Oldest first</option>
          </select>
        </div>
        <button type="button" className="filters__cta" onClick={openCreate}>
          Add event
        </button>
      </div>

      <DataTable<EventRow>
        columns={columns}
        rows={events as EventRow[]}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        loading={loading}
      />

      {createOpen && (
        <div className="modal" role="dialog" aria-modal="true">
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
        <div className="modal" role="dialog" aria-modal="true">
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
        <div className="modal" role="dialog" aria-modal="true">
          <div ref={detailRef} className="modal-content modal-content--detail">
            <h3>{detail.title}</h3>
            <dl className="event-detail">
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusChip status={(detail.status as any) ?? 'upcoming'} />
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
            <div className="detail-actions">
              <button type="button" onClick={() => openEdit(detail)}>
                Edit
              </button>
              <button type="button" onClick={() => handleDelete(detail._id, detail.title)}>
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
