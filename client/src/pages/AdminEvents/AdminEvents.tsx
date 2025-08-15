import { useCallback, useEffect, useState } from 'react';
import {
  fetchEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
  type EventQueryParams,
} from '../../api/admin';
import Loader from '../../components/Loader';
import toast from '../../components/toast';
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

interface FormState {
  title: string;
  startAt: string;
  endAt: string;
  capacity: number;
}

const emptyForm: FormState = {
  title: '',
  startAt: '',
  endAt: '',
  capacity: 0,
};

const AdminEvents = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-startAt');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<EventItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: EventQueryParams = {
        status: status || undefined,
        sort,
        page,
        pageSize,
      };
      const data = await fetchEvents(params);
      setEvents(data.items as EventItem[]);
      setTotal(data.total);
    } catch {
      toast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  }, [status, sort, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(form.startAt) >= new Date(form.endAt)) {
      toast('startAt must be before endAt', 'error');
      return;
    }
    setSaving(true);
    try {
      const created = await apiCreateEvent(form);
      setEvents((prev) => [created, ...prev]);
      setCreateOpen(false);
      setForm(emptyForm);
    } catch {
      toast('Failed to create event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (ev: EventItem) => {
    setEdit(ev);
    setForm({
      title: ev.title,
      startAt: ev.startAt.slice(0, 16),
      endAt: ev.endAt.slice(0, 16),
      capacity: ev.capacity,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    if (new Date(form.startAt) >= new Date(form.endAt)) {
      toast('startAt must be before endAt', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await apiUpdateEvent(edit._id, form);
      setEvents((prev) => prev.map((ev) => (ev._id === edit._id ? updated : ev)));
      setEdit(null);
    } catch {
      toast('Failed to update event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await apiDeleteEvent(id);
      setEvents((prev) => prev.filter((ev) => ev._id !== id));
      setTotal((t) => t - 1);
    } catch {
      toast('Failed to delete event', 'error');
    }
  };

  return (
    <div className="admin-events">
      <h2>Events</h2>
      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="past">Past</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="-startAt">Newest</option>
          <option value="startAt">Oldest</option>
        </select>
        <button onClick={() => setCreateOpen(true)}>Add Event</button>
      </div>
      {loading ? (
        <Loader />
      ) : (
        <table className="events-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Capacity</th>
              <th>Registered</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev._id}>
                <td>{ev.title}</td>
                <td>{new Date(ev.startAt).toLocaleString()}</td>
                <td>{new Date(ev.endAt).toLocaleString()}</td>
                <td>{ev.status}</td>
                <td>{ev.capacity}</td>
                <td>{ev.registered}</td>
                <td className="actions">
                  <button onClick={() => openEdit(ev)}>Edit</button>
                  <button onClick={() => handleDelete(ev._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>
        <span>
          {page}/{totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      {createOpen && (
        <div className="modal">
          <form className="modal-content" onSubmit={handleCreate}>
            <h3>Create Event</h3>
            <label>
              Title
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Start
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
            </label>
            <label>
              End
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </label>
            <label>
              Capacity
              <input
                type="number"
                value={form.capacity}
                onChange={(e) =>
                  setForm({ ...form, capacity: Number(e.target.value) })
                }
              />
            </label>
            <div className="modal-actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {edit && (
        <div className="modal">
          <form className="modal-content" onSubmit={handleUpdate}>
            <h3>Edit Event</h3>
            <label>
              Title
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Start
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
            </label>
            <label>
              End
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </label>
            <label>
              Capacity
              <input
                type="number"
                value={form.capacity}
                onChange={(e) =>
                  setForm({ ...form, capacity: Number(e.target.value) })
                }
              />
            </label>
            <div className="modal-actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEdit(null)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;
