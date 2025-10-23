import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { createEvent, updateEvent } from '@/api/admin';
import showToast from '@/components/ui/Toast';
import { toErrorMessage } from '@/lib/response';
import { paths } from '@/routes/paths';
import type { AdminEventContext } from './AdminEventManageLayout';
import styles from './AdminEvents.module.scss';

type Mode = 'create' | 'edit';

type FormState = {
  title: string;
  category: string;
  type: string;
  format: string;
  startAt: string;
  endAt: string;
  registrationOpenAt: string;
  registrationCloseAt: string;
  teamSize: string;
  capacity: string;
  entryFee: string;
  prizePool: string;
  mode: 'online' | 'venue';
  venue: string;
  description: string;
  rules: string;
  bannerUrl: string;
  coverUrl: string;
};

const defaultFormState = (): FormState => {
  const now = new Date();
  const plusOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const plusTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const toInput = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };
  return {
    title: '',
    category: 'other',
    type: 'tournament',
    format: 'single_match',
    startAt: toInput(plusTwoHours),
    endAt: toInput(new Date(plusTwoHours.getTime() + 2 * 60 * 60 * 1000)),
    registrationOpenAt: toInput(now),
    registrationCloseAt: toInput(plusOneHour),
    teamSize: '1',
    capacity: '32',
    entryFee: '0',
    prizePool: '',
    mode: 'online',
    venue: '',
    description: '',
    rules: '',
    bannerUrl: '',
    coverUrl: '',
  };
};

const toLocalInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toISO = (value: string) => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const resolveEventId = (input: any): string | null => {
  const visited = new Set<any>();
  let current: any = input;
  while (current && typeof current === 'object' && !visited.has(current)) {
    visited.add(current);
    const candidate = current?._id ?? current?.id;
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
    if (current?.event) {
      current = current.event;
      continue;
    }
    if (current?.data) {
      current = current.data;
      continue;
    }
    break;
  }
  return null;
};

interface AdminEventEditorPageProps {
  mode?: Mode;
}

const AdminEventEditorPage = ({ mode = 'edit' }: AdminEventEditorPageProps) => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const context = mode === 'edit' ? useOutletContext<AdminEventContext>() : undefined;
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'create') {
      setForm(defaultFormState());
      return;
    }
    if (!context?.event) return;
    const event = context.event;
    setForm({
      title: event.title,
      category: event.category ?? 'other',
      type: event.type ?? 'tournament',
      format: event.format ?? 'single_match',
      startAt: toLocalInput(event.startAt),
      endAt: toLocalInput(event.endAt),
      registrationOpenAt: toLocalInput(event.registrationOpenAt),
      registrationCloseAt: toLocalInput(event.registrationCloseAt),
      teamSize: String(event.teamSize ?? 1),
      capacity: String(event.maxParticipants ?? 0),
      entryFee:
        typeof event.entryFeePaise === 'number'
          ? String(Math.max(0, Math.round(event.entryFeePaise / 100)))
          : '0',
      prizePool: event.prizePool ?? '',
      mode: event.mode === 'venue' ? 'venue' : 'online',
      venue: event.mode === 'venue' ? event.venue ?? '' : '',
      description: event.description ?? '',
      rules: event.rules ?? '',
      bannerUrl: event.bannerUrl ?? '',
      coverUrl: event.coverUrl ?? '',
    });
  }, [context?.event, mode]);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (eventObj: FormEvent<HTMLFormElement>) => {
    eventObj.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim() || 'other',
        type: form.type,
        format: form.format,
        startAt: toISO(form.startAt),
        endAt: toISO(form.endAt),
        registrationOpenAt: toISO(form.registrationOpenAt),
        registrationCloseAt: toISO(form.registrationCloseAt),
        teamSize: Number(form.teamSize) || 1,
        capacity: Math.max(0, Math.round(Number(form.capacity) || 0)),
        entryFeePaise: Math.max(0, Math.round(Number(form.entryFee || 0) * 100)),
        prizePool: form.prizePool.trim() || undefined,
        mode: form.mode,
        venue: form.mode === 'venue' ? form.venue.trim() : undefined,
        description: form.description.trim(),
        rules: form.rules.trim(),
        bannerUrl: form.bannerUrl.trim() || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
      };

      if (mode === 'create') {
        const created = await createEvent(payload);
        const createdId = resolveEventId(created);
        showToast('Event created', 'success');
        if (createdId) {
          navigate(paths.admin.events.detail(createdId));
        } else {
          showToast('Event created but missing identifier. Refresh the list to continue.', 'info');
          navigate(paths.admin.events.list());
        }
      } else if (eventId) {
        await updateEvent(eventId, payload);
        showToast('Event updated', 'success');
        if (context?.refresh) {
          await context.refresh();
        }
      }
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = mode === 'create' ? 'Create event' : 'Edit event';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1>{pageTitle}</h1>
          <p>Configure tournament details, schedule, and participant caps.</p>
        </div>
      </header>
      <form className={`${styles.panel} ${styles.form}`} onSubmit={handleSubmit}>
        {error && <div className={styles.errorCard}>{error}</div>}
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor="event-title">Title</label>
            <input
              id="event-title"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="event-category">Category</label>
            <input
              id="event-category"
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="event-type">Type</label>
            <select
              id="event-type"
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              <option value="tournament">Tournament</option>
              <option value="activity">Activity</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="event-format">Format</label>
            <select
              id="event-format"
              value={form.format}
              onChange={(e) => handleChange('format', e.target.value)}
            >
              <option value="single_match">Single match</option>
              <option value="round_robin">Round robin</option>
              <option value="points">Points</option>
              <option value="single_elim">Single elimination</option>
              <option value="double_elim">Double elimination</option>
            </select>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor="registration-open">Registration opens</label>
            <input
              id="registration-open"
              type="datetime-local"
              value={form.registrationOpenAt}
              onChange={(e) => handleChange('registrationOpenAt', e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="registration-close">Registration closes</label>
            <input
              id="registration-close"
              type="datetime-local"
              value={form.registrationCloseAt}
              onChange={(e) => handleChange('registrationCloseAt', e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="start-at">Start</label>
            <input
              id="start-at"
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => handleChange('startAt', e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="end-at">End</label>
            <input
              id="end-at"
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => handleChange('endAt', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor="team-size">Team size</label>
            <input
              id="team-size"
              type="number"
              min={1}
              value={form.teamSize}
              onChange={(e) => handleChange('teamSize', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="max-participants">Capacity</label>
            <input
              id="max-participants"
              type="number"
              min={0}
              value={form.capacity}
              onChange={(e) => handleChange('capacity', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="entry-fee">Entry fee (₹)</label>
            <input
              id="entry-fee"
              type="number"
              min={0}
              value={form.entryFee}
              onChange={(e) => handleChange('entryFee', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="prize-pool">Prize pool</label>
            <input
              id="prize-pool"
              value={form.prizePool}
              onChange={(e) => handleChange('prizePool', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor="mode">Mode</label>
            <select
              id="mode"
              value={form.mode}
              onChange={(e) => handleChange('mode', e.target.value as FormState['mode'])}
            >
              <option value="online">Online</option>
              <option value="venue">Venue</option>
            </select>
          </div>
          {form.mode === 'venue' && (
            <div className={styles.field}>
              <label htmlFor="venue">Venue</label>
              <input
                id="venue"
                value={form.venue}
                onChange={(e) => handleChange('venue', e.target.value)}
              />
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="rules">Rules</label>
          <textarea id="rules" value={form.rules} onChange={(e) => handleChange('rules', e.target.value)} />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor="banner-url">Banner image URL</label>
            <input
              id="banner-url"
              value={form.bannerUrl}
              onChange={(e) => handleChange('bannerUrl', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="cover-url">Cover image URL</label>
            <input
              id="cover-url"
              value={form.coverUrl}
              onChange={(e) => handleChange('coverUrl', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => (mode === 'create' ? navigate(paths.admin.events.list()) : context?.refresh?.())}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className={styles.primaryBtn} disabled={saving}>
            {saving ? <Loader2 size={16} className={styles.spin} /> : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminEventEditorPage;
