import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchEvents } from '@/store/events.slice';
import EventCard from '@/components/events/EventCard';

export default function EventsHub() {
  const dispatch = useAppDispatch();
  const eventsState = useAppSelector((s) => s.events.list);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'events' | 'tournaments' | 'registered'>('all');

  useEffect(() => {
    if (!eventsState.loading && (eventsState.items?.length ?? 0) === 0) {
      void dispatch(fetchEvents({ pageSize: 24 }));
    }
  }, [dispatch, eventsState.loading, eventsState.items?.length]);

  const ql = q.trim().toLowerCase();
  const filtered = useMemo(
    () => (eventsState.items ?? []).filter((e: any) => !ql || (e.title || '').toLowerCase().includes(ql)),
    [eventsState.items, ql],
  );
  const display = useMemo(() => {
    let arr = filtered;
    if (tab === 'all') arr = arr.filter((e: any) => !e.completed);
    if (tab === 'events') arr = arr.filter((e: any) => e.type === 'event' && !e.completed);
    if (tab === 'tournaments') arr = arr.filter((e: any) => e.type === 'tournament' && !e.completed);
    if (tab === 'registered') arr = filtered.filter((e: any) => Boolean(e.isRegistered));
    return arr;
  }, [filtered, tab]);

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Events</h1>
          <span className="rounded-full border border-borderc/40 px-3 py-1 text-xs uppercase tracking-wide text-text-muted">
            {display.length > 0 ? `${display.length} happening soon` : 'Stay tuned'}
          </span>
        </div>
        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events…"
            className="w-full rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2"
            aria-label="Search events"
          />
        </div>
        <div className="overflow-x-auto flex gap-2 pb-1">
          {['all', 'events', 'tournaments', 'registered'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`px-3 py-2 rounded-full border ${tab === t ? 'bg-surface-2 border-accent-500 text-white' : 'bg-surface-1 border-borderc/40 text-text-primary'}`}
              type="button"
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>
      {display.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {display.map((e: any) => (
            <EventCard key={e._id} event={e} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-borderc/60 bg-surface-1 px-4 py-10 text-center text-sm text-text-muted">
          There are no events in this view just yet. Follow us on WhatsApp or switch tabs to explore other categories.
        </div>
      )}
    </div>
  );
}
