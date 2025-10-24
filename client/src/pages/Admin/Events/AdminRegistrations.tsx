import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useOutletContext, useParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store';
import { fetchRegistrations } from '@/store/events.slice';
import { formatDateTime } from '@/utils/date';
import type { EventRegistration } from '@/types/events';
import type { AdminEventContext } from './AdminEventLayout';
import styles from './AdminRegistrations.module.scss';

type RegistrationStatus = EventRegistration['status'];

const statusLabels: Record<RegistrationStatus, string> = {
  registered: 'Registered',
  waitlisted: 'Waitlisted',
  checked_in: 'Checked in',
  withdrawn: 'Withdrawn',
  disqualified: 'Disqualified',
};

const STATUS_OPTIONS: RegistrationStatus[] = [
  'registered',
  'waitlisted',
  'checked_in',
  'withdrawn',
  'disqualified',
];

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

const AdminRegistrations = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const context = useOutletContext<AdminEventContext>();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const registrationsState = useSelector((state: RootState) => state.events.registrations);
  const event = context?.event;

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const statusBadgeClass = (status: RegistrationStatus) => {
    switch (status) {
      case 'registered':
        return `${styles.statusBadge} ${styles.badgeRegistered}`;
      case 'waitlisted':
        return `${styles.statusBadge} ${styles.badgeWaitlisted}`;
      case 'checked_in':
        return `${styles.statusBadge} ${styles.badgeCheckedIn}`;
      case 'withdrawn':
        return `${styles.statusBadge} ${styles.badgeWithdrawn}`;
      case 'disqualified':
        return `${styles.statusBadge} ${styles.badgeDisqualified}`;
      default:
        return styles.statusBadge;
    }
  };

  const handleStatusToggle = (status: RegistrationStatus) => {
    setStatusFilter((prev) => {
      if (prev.includes(status)) {
        return prev.filter((value) => value !== status);
      }
      return [...prev, status];
    });
    setPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter([]);
    setSearchTerm('');
    setPage(1);
  };

  const filtersActive = statusFilter.length > 0 || debouncedSearch.length > 0;
  const statusSet = useMemo(() => new Set(statusFilter), [statusFilter]);

  const loadRegistrations = useCallback(async () => {
    if (!eventId) return;
    const action = await dispatch(
      fetchRegistrations({
        eventId,
        page,
        limit: PAGE_SIZE,
        status: statusFilter,
        search: debouncedSearch,
        admin: true,
      }),
    );
    if (fetchRegistrations.fulfilled.match(action)) {
      setLastUpdatedAt(new Date().toISOString());
    }
  }, [debouncedSearch, dispatch, eventId, page, statusFilter]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  useEffect(() => {
    if (!eventId) return undefined;
    const interval = window.setInterval(() => {
      void loadRegistrations();
    }, 20000);
    return () => window.clearInterval(interval);
  }, [eventId, loadRegistrations]);

  const registrations = registrationsState.items ?? [];
  const totalRegistered = registrationsState.total ?? registrations.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRegistered / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const showingStart = totalRegistered === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(totalRegistered, page * PAGE_SIZE);
  const waitlisted = useMemo(
    () => registrations.filter((item) => item?.status === 'waitlisted').length,
    [registrations],
  );
  const checkedIn = useMemo(
    () => registrations.filter((item) => item?.status === 'checked_in').length,
    [registrations],
  );
  const hasCapacityLimit = Boolean(event?.maxParticipants && event.maxParticipants > 0);
  const slotsRemaining = hasCapacityLimit ? Math.max(0, (event?.maxParticipants ?? 0) - totalRegistered) : null;
  const occupancyPercent = useMemo(() => {
    if (!hasCapacityLimit) return null;
    if (!event?.maxParticipants) return null;
    return Math.min(100, Math.round((totalRegistered / event.maxParticipants) * 100));
  }, [event?.maxParticipants, hasCapacityLimit, totalRegistered]);
  const checklist = useMemo(
    () =>
      (event?.registrationChecklist ?? [])
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
    [event?.registrationChecklist],
  );
  const rewards = useMemo(
    () => (event?.rewards ?? []).filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
    [event?.rewards],
  );
  const lastUpdatedLabel = lastUpdatedAt ? formatDateTime(lastUpdatedAt) : null;
  const isLoading = registrationsState.loading;
  const hasError = Boolean(registrationsState.error);
  const statusBreakdown = useMemo(() => {
    const map: Record<RegistrationStatus, number> = {
      registered: 0,
      waitlisted: 0,
      checked_in: 0,
      withdrawn: 0,
      disqualified: 0,
    };
    registrations.forEach((registration) => {
      const key = registration.status;
      if (map[key] !== undefined) {
        map[key] += 1;
      }
    });
    return map;
  }, [registrations]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>Player pipeline</span>
          <h2>Registrations</h2>
          <p>Monitor sign-ups, waitlists, and squad rosters in real time.</p>
          <div className={styles.heroMeta}>
            <span className={styles.metaChip}>
              {hasCapacityLimit ? `Capacity ${event?.maxParticipants}` : 'Unlimited slots'}
            </span>
            <span className={styles.metaChip}>Team size {event?.teamSize ?? 1}</span>
            <span className={styles.metaChip}>
              {isLoading ? <Loader2 size={14} className={styles.spin} /> : lastUpdatedLabel ? `Synced ${lastUpdatedLabel}` : 'Awaiting sync'}
            </span>
          </div>
        </div>
        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => void loadRegistrations()}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={16} className={styles.spin} /> : <RefreshCw size={16} />} Refresh feed
          </button>
        </div>
      </header>

      {registrationsState.preview && (
        <div className={styles.infoBanner}>
          Preview mode enabled — showing the first {registrations.length} registrations from the feed.
        </div>
      )}

      <section className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status</span>
          <div className={styles.filterChips}>
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.filterChip} ${statusSet.has(option) ? styles.filterChipActive : ''}`}
                onClick={() => handleStatusToggle(option)}
              >
                {statusLabels[option]}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.searchGroup}>
          <label className={styles.searchLabel}>
            Search
            <input
              type="search"
              className={styles.searchInput}
              value={searchTerm}
              placeholder="Name, email or phone"
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>
        {filtersActive && (
          <button type="button" className={styles.clearFilters} onClick={handleClearFilters}>
            Clear filters
          </button>
        )}
      </section>

      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Total registered</span>
          <span className={styles.metricValue}>{totalRegistered}</span>
          {hasCapacityLimit && <span className={styles.metricSub}>of {event?.maxParticipants}</span>}
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Checked in</span>
          <span className={styles.metricValue}>{checkedIn}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Waitlisted</span>
          <span className={styles.metricValue}>{waitlisted}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Slots remaining</span>
          <span className={styles.metricValue}>{slotsRemaining !== null ? slotsRemaining : '∞'}</span>
          <span className={styles.metricSub}>{hasCapacityLimit ? 'Limited seats' : 'No cap'}</span>
        </div>
      </section>

      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <span className={styles.metricLabel}>Enrollment progress</span>
          <span className={styles.progressValue}>
            {occupancyPercent !== null ? `${occupancyPercent}% full` : 'Unlimited capacity'}
          </span>
        </div>
        <div className={styles.progressTrack}>
          <span className={styles.progressBar} style={{ width: `${occupancyPercent ?? 100}%` }} />
        </div>
        <div className={styles.progressMeta}>
          <span>{totalRegistered} registered</span>
          {slotsRemaining !== null && <span>{slotsRemaining} slots left</span>}
        </div>
      </div>

      <div className={styles.statusChips}>
        {(Object.keys(statusBreakdown) as RegistrationStatus[]).map((statusKey) => (
          <span key={statusKey} className={styles.statusChip}>
            {statusLabels[statusKey]} • {statusBreakdown[statusKey]}
          </span>
        ))}
      </div>

      {(checklist.length > 0 || rewards.length > 0) && (
        <section className={styles.sidePanels}>
          {checklist.length > 0 && (
            <div className={styles.sidePanel}>
              <h3>Registration checklist</h3>
              <ul>
                {checklist.map((item, index) => (
                  <li key={`check-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {rewards.length > 0 && (
            <div className={styles.sidePanel}>
              <h3>Rewards</h3>
              <ul>
                {rewards.map((item, index) => (
                  <li key={`reward-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {hasError ? (
        <div className={styles.stateCard}>
          <p>{registrationsState.error}</p>
          <button type="button" className={styles.secondaryBtn} onClick={() => void loadRegistrations()}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      ) : isLoading && registrations.length === 0 ? (
        <div className={styles.stateCard}>
          <Loader2 size={18} className={styles.spin} /> Loading registrations…
        </div>
      ) : registrations.length === 0 ? (
        <div className={styles.emptyState}>No participants have registered yet.</div>
      ) : (
        <div className={styles.list}>
          {registrations.map((registration) => (
            <article key={registration._id} className={styles.card}>
              <div className={styles.cardHeader}>
                <strong>{registration.teamName ?? registration.user?.name ?? 'Solo entrant'}</strong>
                <span className={statusBadgeClass(registration.status)}>
                  {statusLabels[registration.status] ?? registration.status}
                </span>
              </div>
              <div className={styles.registrationMeta}>
                {registration.user?.name && <span className={styles.metaChip}>Captain {registration.user.name}</span>}
                {registration.createdAt && (
                  <span className={styles.metaChip}>Registered {formatDateTime(registration.createdAt)}</span>
                )}
              </div>
              {Array.isArray(registration.members) && registration.members.length > 0 && (
                <div className={styles.memberList}>
                  {registration.members.map((member, index) => {
                    const displayName = member?.name?.trim().length ? member.name : `Member ${index + 1}`;
                    return (
                      <span key={`${registration._id}-member-${index}`} className={styles.memberBadge}>
                        {displayName}
                        {member?.contact && <span className={styles.memberContact}>{member.contact}</span>}
                      </span>
                    );
                  })}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {totalRegistered > 0 && (
        <footer className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Showing {showingStart.toLocaleString()}–{showingEnd.toLocaleString()} of {totalRegistered.toLocaleString()}
          </span>
          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.paginationButton}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={!canPrev || isLoading}
            >
              Previous
            </button>
            <span className={styles.paginationPage}>
              Page {Math.min(page, totalPages)} of {totalPages.toLocaleString()}
            </span>
            <button
              type="button"
              className={styles.paginationButton}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={!canNext || isLoading}
            >
              Next
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default AdminRegistrations;
