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

const AdminRegistrations = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const context = useOutletContext<AdminEventContext>();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const registrationsState = useSelector((state: RootState) => state.events.registrations);
  const event = context?.event;

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

  const loadRegistrations = useCallback(async () => {
    if (!eventId) return;
    const action = await dispatch(fetchRegistrations(eventId));
    if (fetchRegistrations.fulfilled.match(action)) {
      setLastUpdatedAt(new Date().toISOString());
    }
  }, [dispatch, eventId]);

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
    </div>
  );
};

export default AdminRegistrations;
