import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useOutletContext, useParams } from 'react-router-dom';
import { Loader2, Plus, RefreshCw, Save, Trash2, Undo2 } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store';
import { fetchLeaderboard, postLeaderboard } from '@/store/events.slice';
import type { EventLeaderboardEntry } from '@/types/events';
import { formatDateTime } from '@/utils/date';
import showToast from '@/components/ui/Toast';
import { toErrorMessage } from '@/lib/response';
import type { AdminEventContext } from './AdminEventLayout';
import styles from './AdminLeaderboard.module.scss';

type EditableEntry = EventLeaderboardEntry & { _localId?: string };

const createEmptyEntry = (index: number): EditableEntry => ({
  _localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  rank: index + 1,
  teamName: '',
  points: 0,
});

const normalizeEntries = (entries: EditableEntry[]): EventLeaderboardEntry[] =>
  entries.map((entry, index) => ({
    _id: entry._id,
    participantId: entry.participantId,
    teamName: entry.teamName?.trim() || undefined,
    user: entry.user?.trim() || undefined,
    score: (() => {
      if (typeof entry.score === 'number' && Number.isFinite(entry.score)) return entry.score;
      if (typeof entry.points === 'number' && Number.isFinite(entry.points)) return entry.points;
      const numeric = Number(entry.score ?? entry.points);
      return Number.isFinite(numeric) ? numeric : 0;
    })(),
    points: (() => {
      if (typeof entry.points === 'number' && Number.isFinite(entry.points)) return entry.points;
      if (typeof entry.score === 'number' && Number.isFinite(entry.score)) return entry.score;
      const numeric = Number(entry.points ?? entry.score);
      return Number.isFinite(numeric) ? numeric : 0;
    })(),
    rank:
      typeof entry.rank === 'number' && Number.isFinite(entry.rank)
        ? entry.rank
        : Number.isFinite(Number(entry.rank))
        ? Number(entry.rank)
        : index + 1,
    wins:
      entry.wins === undefined || entry.wins === null || Number.isNaN(Number(entry.wins))
        ? undefined
        : Number(entry.wins),
    losses:
      entry.losses === undefined || entry.losses === null || Number.isNaN(Number(entry.losses))
        ? undefined
        : Number(entry.losses),
    kills:
      entry.kills === undefined || entry.kills === null || Number.isNaN(Number(entry.kills))
        ? undefined
        : Number(entry.kills),
    time:
      entry.time === undefined || entry.time === null || Number.isNaN(Number(entry.time))
        ? undefined
        : Number(entry.time),
  }));

const AdminLeaderboard = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const context = useOutletContext<AdminEventContext>();
  const dispatch = useDispatch<AppDispatch>();
  const { leaderboard, postStatus } = useSelector((state: RootState) => ({
    leaderboard: state.events.leaderboard,
    postStatus: state.events.actions.postLeaderboard,
  }));
  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const event = context?.event;

  const loadLeaderboard = useCallback(async () => {
    if (!eventId) return;
    const action = await dispatch(fetchLeaderboard(eventId));
    if (fetchLeaderboard.fulfilled.match(action)) {
      setLastSynced(new Date().toISOString());
    }
  }, [dispatch, eventId]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    if (!eventId) return undefined;
    const interval = window.setInterval(() => {
      void loadLeaderboard();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [eventId, loadLeaderboard]);

  useEffect(() => {
    const nextEntries = (leaderboard.items ?? []).map((entry, index) => ({
      ...entry,
      _localId: entry._id ?? `remote-${index}`,
    }));
    setEntries(nextEntries);
    setDirty(false);
  }, [leaderboard.items, leaderboard.version]);

  const isSaving = postStatus === 'loading';
  const isLoading = leaderboard.loading;
  const leaderboardError = leaderboard.error;
  const versionLabel = leaderboard.version ? `v${leaderboard.version}` : 'Draft';
  const lastSyncedLabel = lastSynced ? formatDateTime(lastSynced) : null;

  const updateEntry = useCallback((index: number, patch: Partial<EditableEntry>) => {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
    setDirty(true);
  }, []);

  const handleNumberChange = useCallback(
    (index: number, key: keyof Pick<EditableEntry, 'rank' | 'points' | 'wins' | 'losses' | 'kills' | 'time'>) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value;
        const value = raw.trim().length === 0 ? undefined : Number(raw);
        const patch: Partial<EditableEntry> = { [key]: value } as Partial<EditableEntry>;
        if (key === 'points') {
          patch.score = value;
        }
        updateEntry(index, patch);
      },
    [updateEntry],
  );

  const handleTextChange = useCallback(
    (index: number, key: keyof Pick<EditableEntry, 'teamName' | 'user' | 'participantId'>) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        updateEntry(index, { [key]: event.target.value } as Partial<EditableEntry>);
      },
    [updateEntry],
  );

  const handleAddEntry = () => {
    setEntries((prev) => [...prev, createEmptyEntry(prev.length)]);
    setDirty(true);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, idx) => idx !== index));
    setDirty(true);
  };

  const handleReset = () => {
    const nextEntries = (leaderboard.items ?? []).map((entry, index) => ({
      ...entry,
      _localId: entry._id ?? `remote-${index}`,
    }));
    setEntries(nextEntries);
    setDirty(false);
  };

  const handleSave = async () => {
    if (!eventId) return;
    const sanitized = normalizeEntries(entries);
    const action = await dispatch(postLeaderboard({ eventId, payload: { entries: sanitized } }));
    if (postLeaderboard.fulfilled.match(action)) {
      showToast('Leaderboard updated', 'success');
      setDirty(false);
      void loadLeaderboard();
    } else {
      const message = toErrorMessage(action.payload ?? action.error);
      showToast(message, 'error');
    }
  };

  const leaderboardEmpty = entries.length === 0;
  const disableSave = isSaving || !dirty;

  const podium = useMemo(() => entries.slice(0, 3).map((entry) => entry.teamName ?? entry.user ?? '—'), [entries]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>Leaderboard control</span>
          <h2>Leaderboard</h2>
          <p>Keep placements updated, spotlight podium finishes, and broadcast scoring in real time.</p>
          <div className={styles.heroMeta}>
            <span className={styles.metaChip}>Version {versionLabel}</span>
            {dirty && <span className={styles.metaChip}>Unsaved changes</span>}
            <span className={styles.metaChip}>
              {isLoading ? <Loader2 size={14} className={styles.spin} /> : null}
              {isLoading ? 'Syncing…' : lastSyncedLabel ? `Synced ${lastSyncedLabel}` : 'Ready'}
            </span>
          </div>
          {podium.length > 0 && !podium.every((item) => !item || item === '—') && (
            <div className={styles.podium}>
              {podium.map((seed, idx) => (
                <span key={`seed-${idx}`} className={styles.podiumChip}>
                  #{idx + 1} {seed || '—'}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className={styles.heroActions}>
          <button type="button" className={styles.secondaryBtn} onClick={() => void loadLeaderboard()} disabled={isLoading}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={handleAddEntry}>
            <Plus size={16} /> Add entry
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={handleReset} disabled={!dirty}>
            <Undo2 size={16} /> Reset
          </button>
          <button type="button" className={styles.primaryBtn} onClick={handleSave} disabled={disableSave}>
            {isSaving ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />} Save
          </button>
        </div>
      </header>

      {leaderboardError && (
        <div className={styles.stateCard}>
          <p>{leaderboardError}</p>
        </div>
      )}

      {event?.prizePool && (
        <div className={styles.summaryStrip}>
          <span>Prize pool</span>
          <strong>{event.prizePool}</strong>
        </div>
      )}

      {leaderboardEmpty ? (
        <div className={styles.emptyState}>No leaderboard entries yet.</div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team / Player</th>
                <th>Score</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Kills</th>
                <th>Time</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry._localId ?? entry._id ?? index}>
                  <td>
                    <input
                      type="number"
                      value={entry.rank ?? ''}
                      onChange={handleNumberChange(index, 'rank')}
                      className={styles.input}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={entry.teamName ?? ''}
                      placeholder="Team name"
                      onChange={handleTextChange(index, 'teamName')}
                      className={styles.input}
                    />
                    <input
                      type="text"
                      value={entry.user ?? ''}
                      placeholder="Player"
                      onChange={handleTextChange(index, 'user')}
                      className={styles.input}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={entry.score ?? entry.points ?? ''}
                      onChange={handleNumberChange(index, 'points')}
                      className={styles.input}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={entry.wins ?? ''}
                      onChange={handleNumberChange(index, 'wins')}
                      className={styles.input}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={entry.losses ?? ''}
                      onChange={handleNumberChange(index, 'losses')}
                      className={styles.input}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={entry.kills ?? ''}
                      onChange={handleNumberChange(index, 'kills')}
                      className={styles.input}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={entry.time ?? ''}
                      onChange={handleNumberChange(index, 'time')}
                      className={styles.input}
                    />
                  </td>
                  <td>
                    <button type="button" className={styles.removeBtn} onClick={() => handleRemoveEntry(index)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminLeaderboard;
