import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import type { AppDispatch, RootState } from '@/store';
import { fetchEvents } from '@/store/events.slice';
import type { EventSummary } from '@/types/events';
import { formatDateTime } from '@/utils/date';
import { formatINR } from '@/utils/currency';
import fallbackImage from '@/assets/no-image.svg';

const safeImage = (url?: string | null) => {
  if (typeof url === 'string' && url.trim().length > 0) return url;
  return fallbackImage;
};

const formatEntryFee = (event: EventSummary) => {
  if (typeof event.entryFee === 'number') {
    if (event.entryFee === 0) return 'Free';
    return formatINR(event.entryFee);
  }
  if (typeof event.entryFeePaise === 'number') {
    if (event.entryFeePaise === 0) return 'Free';
    return formatINR(event.entryFeePaise / 100);
  }
  return 'Free';
};

const isCompleted = (event: EventSummary & { completed?: boolean }) => {
  if (typeof event.completed === 'boolean') return event.completed;
  return event.status === 'completed' || event.status === 'canceled';
};

const isTournament = (event: EventSummary) => event.type === 'tournament';

const isRegistered = (event: EventSummary & { isRegistered?: boolean }) => {
  if (typeof event.isRegistered === 'boolean') return event.isRegistered;
  const status = event.myRegistrationStatus ?? event.registrationStatus ?? event.registration?.status;
  if (!status) return false;
  return !['withdrawn', 'canceled'].includes(status);
};

const EventsHub: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'events' | 'tournaments' | 'registered'>('all');
  const eventsState = useSelector((state: RootState) => state.events.list);

  useEffect(() => {
    dispatch(fetchEvents({ page: 1, pageSize: 50 }));
  }, [dispatch]);

  const filteredEvents = useMemo(() => {
    const items = Array.isArray(eventsState.items) ? eventsState.items : [];
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((event) => {
      const label = (event.title || event.name || '').toLowerCase();
      return label.includes(query);
    });
  }, [eventsState.items, search]);

  const displayEvents = useMemo(() => {
    let arr = filteredEvents;
    if (tab === 'all') arr = arr.filter((e) => !isCompleted(e));
    if (tab === 'events') arr = arr.filter((e) => !isTournament(e) && !isCompleted(e));
    if (tab === 'tournaments') arr = arr.filter((e) => isTournament(e) && !isCompleted(e));
    if (tab === 'registered') arr = filteredEvents.filter((e) => isRegistered(e));
    return arr;
  }, [filteredEvents, tab]);

  const now = Date.now();

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Stay updated with upcoming events, tournaments, and registrations happening in Manacity.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events"
            className="w-full rounded-lg border border-borderc/40 bg-surface-1 px-4 py-2 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:max-w-sm"
          />
        </div>
        <div className="mt-3 overflow-x-auto flex gap-2 pb-1">
          {['all', 'events', 'tournaments', 'registered'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`px-3 py-2 rounded-full border ${
                tab === t
                  ? 'bg-surface-2 border-accent-500 text-white'
                  : 'bg-surface-1 border-borderc/40 text-text-primary'
              }`}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <section className="space-y-4">
        {eventsState.loading && displayEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Loading events...
          </div>
        ) : displayEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            No events found.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayEvents.map((event) => {
              const startTime = Date.parse(event.startAt);
              const timeDiff = Number.isFinite(startTime) ? startTime - now : null;
              const startsSoon = typeof timeDiff === 'number' && timeDiff > 0 && timeDiff < 24 * 3600 * 1000;

              return (
                <article
                  key={event._id}
                  className="flex flex-col overflow-hidden rounded-xl border border-borderc/40 bg-surface-1 shadow-sm"
                >
                  <img
                    src={safeImage(event.bannerUrl)}
                    alt={event.title}
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">{event.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(event.startAt)}
                        {startsSoon && <span className="ml-2 text-amber-400">Starts soon</span>}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="rounded-full bg-surface-2 px-3 py-1 text-text-primary">
                        Entry: {formatEntryFee(event)}
                      </span>
                      {event.prizePool && (
                        <span className="rounded-full bg-surface-2 px-3 py-1 text-text-primary">
                          Prize: {event.prizePool}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex justify-between">
                      <Link
                        to={`/events/${event._id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600"
                      >
                        View details
                      </Link>
                      {isRegistered(event) && (
                        <span className="self-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                          Registered
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default EventsHub;
