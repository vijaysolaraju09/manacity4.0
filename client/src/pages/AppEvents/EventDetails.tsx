import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import showToast from '@/components/ui/Toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchEventById } from '@/store/events.slice';
import { api } from '@/utils/api';

export default function EventDetails() {
  const { eventId = '' } = useParams();
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const detail = useAppSelector((s) => s.events.detail);
  const event = detail.data;

  useEffect(() => {
    if (eventId) {
      void dispatch(fetchEventById(eventId));
    }
  }, [dispatch, eventId]);

  if (detail.loading && !event) {
    return <div className="p-6">Loading…</div>;
  }

  if (!event) {
    return <div className="p-6">Event not found.</div>;
  }

  const registrationClose = event.registrationCloseAt
    ? Date.parse(event.registrationCloseAt)
    : event.regCloseAt
    ? Date.parse(event.regCloseAt)
    : undefined;
  const isClosed = registrationClose !== undefined && registrationClose < Date.now();

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <button onClick={() => nav(-1)} className="mb-3 text-accent-500" type="button">
        &larr; Back
      </button>
      <div className="rounded-2xl border border-borderc/40 bg-surface-1 p-4 shadow-inner-card">
        <h1 className="text-3xl font-bold mb-3">{event.title}</h1>
        {event.coverUrl && (
          <img
            src={event.coverUrl}
            alt={event.title}
            className="w-full h-64 object-cover rounded-xl mb-4"
          />
        )}
        <p className="text-text-muted mb-2">{event.description}</p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
          <span>{event.type}</span>
          {event.entryFee ? <span>Entry: ₹{event.entryFee}</span> : <span>Free entry</span>}
          {event.startAt && <span>Starts: {new Date(event.startAt).toLocaleString()}</span>}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            className="btn btn-primary"
            disabled={Boolean(event.registration?.status) || isClosed}
            onClick={async () => {
              try {
                await api.post(`/api/events/${event._id}/register`, {});
                showToast('Registered', 'success');
                void dispatch(fetchEventById(event._id));
              } catch (e: any) {
                showToast(e?.response?.data?.message || 'Registration failed', 'error');
              }
            }}
            type="button"
          >
            {event.registration?.status
              ? 'Registered'
              : isClosed
              ? 'Registration closed'
              : 'Register'}
          </button>
          <a
            aria-label="WhatsApp admin"
            className="btn btn-ghost btn-circle"
            target="_blank"
            rel="noreferrer"
            href={`https://wa.me/${event.contact?.phone || '919999999999'}?text=${encodeURIComponent(
              `Hi regarding ${event.title || 'event'}`,
            )}`}
          >
            💬
          </a>
        </div>
      </div>
    </div>
  );
}
