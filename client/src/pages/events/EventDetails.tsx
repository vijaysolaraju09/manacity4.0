import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '@/store';
import {
  fetchEventById,
  fetchEventUpdates,
  fetchLeaderboard,
  registerForEvent,
} from '@/store/events.slice';
import { formatDateTime, formatTimeAgo } from '@/utils/date';
import { formatINR } from '@/utils/currency';
import fallbackImage from '@/assets/no-image.svg';

const safeImage = (url?: string | null) => {
  if (typeof url === 'string' && url.trim().length > 0) return url;
  return fallbackImage;
};

const EventDetails: FC = () => {
  const { eventId } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState<'updates' | 'leaderboard'>('updates');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const detailState = useSelector((state: RootState) => state.events.detail);
  const updatesState = useSelector((state: RootState) => state.events.updates);
  const leaderboardState = useSelector((state: RootState) => state.events.leaderboard);
  const registerAction = useSelector((state: RootState) => state.events.actions.register);
  const myRegistration = useSelector((state: RootState) => state.events.myRegistration.data);

  const ev = detailState.data;
  const latestUpdateTime = updatesState.items[0]?.createdAt;

  useEffect(() => {
    if (!eventId) return;
    dispatch(fetchEventById(eventId));
    dispatch(fetchEventUpdates(eventId));
    dispatch(fetchLeaderboard(eventId));
  }, [dispatch, eventId]);

  const now = Date.now();
  const startsInMs = ev?.startAt ? new Date(ev.startAt).getTime() - now : null;
  const underDay = typeof startsInMs === 'number' && startsInMs > 0 && startsInMs < 24 * 3600 * 1000;

  const registrationStatus = useMemo(() => {
    if (!ev) return null;
    return ev.myRegistrationStatus ?? ev.registrationStatus ?? ev.registration?.status ?? null;
  }, [ev]);

  const entryFeeLabel = useMemo(() => {
    if (!ev) return 'Free';
    if (typeof ev.entryFee === 'number') {
      if (ev.entryFee === 0) return 'Free';
      return formatINR(ev.entryFee);
    }
    if (typeof ev.entryFeePaise === 'number') {
      if (ev.entryFeePaise === 0) return 'Free';
      return formatINR(ev.entryFeePaise / 100);
    }
    return 'Free';
  }, [ev]);

  const adminPhone = useMemo(() => ev?.contact?.phone ?? '', [ev?.contact?.phone]);

  const handleRegister = async () => {
    if (!eventId) return;
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await dispatch(registerForEvent({ eventId, payload: {} })).unwrap();
      setStatusMessage('Successfully registered for this event.');
    } catch (err) {
      setErrorMessage(typeof err === 'string' ? err : 'Registration failed.');
    }
  };

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <button onClick={() => nav(-1)} className="mb-3 text-accent-500">
        &larr; Back
      </button>

      {detailState.loading && !ev ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Loading event...
        </div>
      ) : !ev ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Event not found.
        </div>
      ) : (
        <article className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-borderc/40">
            <img src={safeImage(ev.coverUrl ?? ev.bannerUrl)} alt={ev.title} className="h-64 w-full object-cover" />
          </div>

          <header className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">{ev.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="rounded-full bg-surface-2 px-3 py-1 text-text-primary">Entry: {entryFeeLabel}</span>
              {ev.prizePool && (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-text-primary">
                  Prize: {ev.prizePool}
                </span>
              )}
              <span className="rounded-full bg-surface-2 px-3 py-1 text-text-primary">
                Participants: {ev.registeredCount} / {ev.maxParticipants || '∞'}
              </span>
            </div>
          </header>

          <section className="space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-semibold text-text-primary">Starts:</span> {formatDateTime(ev.startAt)}
              {underDay && <span className="ml-2 text-amber-400 text-sm">Starts soon</span>}
            </div>
            {ev.registrationCloseAt && (
              <div>
                <span className="font-semibold text-text-primary">Registration closes:</span>{' '}
                {formatDateTime(ev.registrationCloseAt)}
              </div>
            )}
            {latestUpdateTime && (
              <div>
                <span className="font-semibold text-text-primary">Last update:</span> {formatTimeAgo(latestUpdateTime)}
              </div>
            )}
          </section>

          {ev.description && (
            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-text-primary">About</h2>
              <p className="text-muted-foreground">{ev.description}</p>
            </section>
          )}

          <section className="flex items-center justify-between rounded-xl border border-borderc/40 bg-surface-1 p-4">
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="text-text-primary font-semibold">Registration status</div>
              <div>{registrationStatus ? registrationStatus : 'Not registered'}</div>
              {statusMessage && <div className="text-emerald-500">{statusMessage}</div>}
              {errorMessage && <div className="text-rose-500">{errorMessage}</div>}
            </div>
            <div className="flex items-center gap-3">
              {adminPhone && (
                <a
                  href={`https://wa.me/${adminPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Contact Admin on WhatsApp"
                  className="text-2xl"
                >
                  💬
                </a>
              )}
              <button
                onClick={handleRegister}
                disabled={registerAction === 'loading' || Boolean(myRegistration)}
                className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {myRegistration ? 'Registered' : registerAction === 'loading' ? 'Registering...' : 'Register'}
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('updates')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  activeTab === 'updates' ? 'bg-accent-500 text-white' : 'bg-surface-2 text-text-primary'
                }`}
              >
                Updates
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  activeTab === 'leaderboard' ? 'bg-accent-500 text-white' : 'bg-surface-2 text-text-primary'
                }`}
              >
                Leaderboard
              </button>
            </div>

            {activeTab === 'updates' ? (
              <div className="space-y-3">
                {updatesState.loading && updatesState.items.length === 0 ? (
                  <div className="rounded-lg border border-borderc/40 p-4 text-sm text-muted-foreground">Loading updates...</div>
                ) : updatesState.items.length === 0 ? (
                  <div className="rounded-lg border border-borderc/40 p-4 text-sm text-muted-foreground">
                    No updates yet. Check back later.
                  </div>
                ) : (
                  updatesState.items.map((update) => (
                    <div key={update._id} className="rounded-lg border border-borderc/40 bg-surface-1 p-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="uppercase tracking-wide">{update.type}</span>
                        <span>{formatTimeAgo(update.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-text-primary">{update.message}</p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboardState.loading && leaderboardState.items.length === 0 ? (
                  <div className="rounded-lg border border-borderc/40 p-4 text-sm text-muted-foreground">Loading leaderboard...</div>
                ) : leaderboardState.items.length === 0 ? (
                  <div className="rounded-lg border border-borderc/40 p-4 text-sm text-muted-foreground">
                    Leaderboard will appear once the event starts.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboardState.items.map((entry, index) => (
                      <div
                        key={entry._id ?? `${entry.participantId ?? 'entry'}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-borderc/40 bg-surface-1 p-4 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-text-primary">#{entry.rank ?? index + 1}</span>
                          <span className="text-text-primary">{entry.teamName ?? entry.user ?? 'Participant'}</span>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          {typeof entry.points === 'number' && <span>Points: {entry.points}</span>}
                          {typeof entry.score === 'number' && <span>Score: {entry.score}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </article>
      )}
    </main>
  );
};

export default EventDetails;
