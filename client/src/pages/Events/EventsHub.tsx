import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw } from 'lucide-react';
import type { RootState, AppDispatch } from '@/store';
import { createEventsQueryKey, fetchEvents } from '@/store/events.slice';
import type { EventSummary } from '@/types/events';
import styles from './EventsHub.module.scss';

type TabKey = 'all' | 'events' | 'tournaments' | 'registrations';

type ExtendedEventSummary = EventSummary & {
  myRegistrationStatus?: string | null;
  registrationStatus?: string | null;
  registration?: { status?: string | null } | null;
};

const TABS: Array<{ id: TabKey; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'events', label: 'Events' },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'registrations', label: 'My Registrations' },
];

const isRegistered = (event: ExtendedEventSummary) => {
  const status = event.myRegistrationStatus ?? event.registrationStatus ?? event.registration?.status;
  if (!status) return false;
  return status !== 'withdrawn' && status !== 'canceled';
};

const EventsHub = () => {
  const dispatch = useDispatch<AppDispatch>();
  const eventsState = useSelector((state: RootState) => state.events.list);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const queryParams = useMemo(() => ({ page: 1, pageSize: 50 }), []);
  const queryKey = useMemo(() => createEventsQueryKey(queryParams), [queryParams]);

  useEffect(() => {
    const promise = dispatch(fetchEvents(queryParams));
    return () => promise.abort?.();
  }, [dispatch, queryKey, queryParams]);

  const items = useMemo(() => {
    return Array.isArray(eventsState.items) ? (eventsState.items as ExtendedEventSummary[]) : [];
  }, [eventsState.items]);

  const registeredItems = useMemo(() => items.filter((item) => isRegistered(item)), [items]);
  const registeredIds = useMemo(
    () => new Set(registeredItems.map((item) => item._id)),
    [registeredItems],
  );

  const groupedItems = useMemo(() => {
    const base = items.filter((item) => !registeredIds.has(item._id));
    return {
      all: base,
      events: base.filter((item) => item.type !== 'tournament'),
      tournaments: base.filter((item) => item.type === 'tournament'),
      registrations: registeredItems,
    } satisfies Record<TabKey, ExtendedEventSummary[]>;
  }, [items, registeredItems, registeredIds]);

  const handleRefresh = () => {
    dispatch(fetchEvents({ ...queryParams }));
  };

  const renderList = (list: ExtendedEventSummary[]) => {
    if (eventsState.loading && list.length === 0) {
      return <p className={styles.message}>Loading events…</p>;
    }

    if (eventsState.error && list.length === 0) {
      return <p className={styles.message}>Unable to load events. Please try again.</p>;
    }

    if (list.length === 0) {
      return <p className={styles.message}>Nothing to show yet.</p>;
    }

    return (
      <ul className={styles.list}>
        {list.map((event) => (
          <li key={event._id} className={styles.listItem}>
            <span className={styles.listTitle}>{event.title}</span>
            <span className={styles.listMeta}>{event.type === 'tournament' ? 'Tournament' : 'Event'}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Events</h1>
        <button type="button" className={styles.refreshButton} onClick={handleRefresh} disabled={eventsState.loading}>
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </header>

      <nav className={styles.tabs} aria-label="Events filters">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className={styles.tabContent} aria-live="polite">
        {renderList(groupedItems[activeTab])}
      </section>
    </div>
  );
};

export default EventsHub;
