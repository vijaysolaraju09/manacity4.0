import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { createEvent, publishEvent, updateEvent } from '@/api/admin';
import type { AdminEventPayload } from '@/api/admin';
import showToast from '@/components/ui/Toast';
import { toErrorMessage } from '@/lib/response';
import { paths } from '@/routes/paths';
import { listTemplates } from '@/store/formsSlice';
import type { AppDispatch, RootState } from '@/store';
import type { AdminEventContext } from './AdminEventLayout';
import styles from './AdminEventEditor.module.scss';

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
  rewards: string;
  structure: string;
  bannerUrl: string;
  coverUrl: string;
  location: string;
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
    venue: 'Online',
    description: '',
    rules: 'Rules will be shared closer to the start date.',
    rewards: 'Prizes will be announced soon.',
    structure: 'Standard format',
    bannerUrl: '',
    coverUrl: '',
    location: 'Online',
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

interface AdminEventEditorProps {
  mode?: Mode;
}

const AdminEventEditor = ({ mode = 'edit' }: AdminEventEditorProps) => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const context = mode === 'edit' ? useOutletContext<AdminEventContext>() : undefined;
  const dispatch = useDispatch<AppDispatch>();
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [submitIntent, setSubmitIntent] = useState<'draft' | 'publish'>('draft');
  const isPublishing = submitIntent === 'publish';

  const templatesState = useSelector((state: RootState) => state.forms.templates);
  const templates = templatesState.items;
  const templatesLoading = templatesState.loading;
  const templatesError = templatesState.error;
  const templatesCount = templates.length;

  const completion = useMemo(() => {
    const keys: Array<keyof FormState> = [
      'title',
      'category',
      'startAt',
      'registrationOpenAt',
      'registrationCloseAt',
      'teamSize',
      'capacity',
      'entryFee',
      'prizePool',
      'description',
    ];
    const total = keys.length;
    const filled = keys.reduce((acc, key) => {
      const value = form[key];
      if (typeof value === 'string' && value.trim().length > 0 && value !== '0') {
        return acc + 1;
      }
      return acc;
    }, 0);
    return Math.min(100, Math.round((filled / total) * 100));
  }, [form]);

  useEffect(() => {
    if (mode === 'create') {
      setForm(defaultFormState());
      setSelectedTemplateId('');
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
      rules: event.rules ?? 'Rules will be shared closer to the start date.',
      rewards: Array.isArray(event.rewards) ? event.rewards.join('\n') : form.rewards,
      structure: event.structure ?? form.structure,
      bannerUrl: event.bannerUrl ?? '',
      coverUrl: event.coverUrl ?? '',
      location: event.venue ?? form.location,
    });
  }, [context?.event, mode]);

  useEffect(() => {
    if (mode !== 'create') return;
    if (templatesLoading) return;
    if (templatesCount > 0) return;
    void dispatch(listTemplates());
  }, [dispatch, mode, templatesCount, templatesLoading]);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (eventObj: FormEvent<HTMLFormElement>) => {
    eventObj.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const intent = submitIntent;
      const venueValue = (form.location || form.venue).trim();
      const rewardLines = form.rewards
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const structureValue = form.structure.trim() || 'Standard format';
      const maxParticipants = Math.max(1, Math.round(Number(form.capacity) || 0));

      const payload: AdminEventPayload = {
        title: form.title.trim(),
        category: form.category.trim() || 'other',
        type: form.type,
        format: form.format,
        startAt: toISO(form.startAt),
        endAt: toISO(form.endAt),
        registrationOpenAt: toISO(form.registrationOpenAt),
        registrationCloseAt: toISO(form.registrationCloseAt),
        teamSize: Number(form.teamSize) || 1,
        capacity: maxParticipants,
        maxParticipants,
        entryFeePaise: Math.max(0, Math.round(Number(form.entryFee || 0) * 100)),
        prizePool: form.prizePool.trim() || undefined,
        mode: form.mode,
        venue: venueValue,
        description: form.description.trim(),
        rules: form.rules.trim() || 'Rules will be shared closer to the start date.',
        rewards: rewardLines.length ? rewardLines : ['Prizes will be announced soon.'],
        structure: structureValue,
        bannerUrl: form.bannerUrl.trim() || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
      };

      if (mode === 'create' && selectedTemplateId) {
        payload.templateId = selectedTemplateId;
      }

      if (mode === 'create') {
        const created = await createEvent(payload);
        const createdId = resolveEventId(created);
        if (intent === 'publish' && createdId) {
          await publishEvent(createdId);
          showToast('Event published', 'success');
          navigate(paths.admin.events.detail(createdId));
        } else if (createdId) {
          showToast('Event saved as draft', 'success');
          navigate(paths.admin.events.detail(createdId));
        } else {
          showToast('Event created but missing identifier. Refresh the list to continue.', 'info');
          navigate(paths.admin.events.list());
        }
      } else if (eventId) {
        await updateEvent(eventId, payload);
        if (intent === 'publish' && context?.event?.status === 'draft') {
          await publishEvent(eventId);
          showToast('Event published', 'success');
        } else {
          showToast('Event updated', 'success');
        }
        if (context?.refresh) await context.refresh();
      }
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      showToast(message, 'error');
    } finally {
      setSubmitIntent('draft');
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>{mode === 'create' ? 'New tournament' : 'Editing tournament'}</span>
          <h1>{mode === 'create' ? 'Create event' : form.title || 'Edit event'}</h1>
          <p>Design the marquee, configure prizes, and script the experience before it goes live.</p>
          <div className={styles.progressTrack}>
            <span className={styles.progressBar} style={{ width: `${completion}%` }} />
          </div>
          <div className={styles.progressMeta}>
            <span>Setup {completion}% complete</span>
            <span>{form.mode === 'venue' ? 'On-ground experience' : 'Online experience'}</span>
          </div>
        </div>
        <div className={styles.heroActions}>
          {mode === 'edit' && eventId && (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => navigate(paths.admin.events.detail(eventId))}
            >
              Back to event
            </button>
          )}
          {mode === 'edit' && (
            <button type="button" className={styles.secondaryBtn} onClick={() => context?.refresh()}>
              Refresh data
            </button>
          )}
        </div>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2>Basics</h2>
            <p>Give your tournament an identity and define the bracket style.</p>
          </div>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>
                Title <span className={styles.requiredMark}>*</span>
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(eventObj) => handleChange('title', eventObj.target.value)}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Category</span>
              <input
                type="text"
                value={form.category}
                onChange={(eventObj) => handleChange('category', eventObj.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Type</span>
              <select value={form.type} onChange={(eventObj) => handleChange('type', eventObj.target.value)}>
                <option value="tournament">Tournament</option>
                <option value="activity">Activity</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Format</span>
              <select value={form.format} onChange={(eventObj) => handleChange('format', eventObj.target.value)}>
                <option value="single_match">Single match</option>
                <option value="single_elim">Single elimination</option>
                <option value="double_elim">Double elimination</option>
                <option value="round_robin">Round robin</option>
                <option value="points">Points table</option>
                <option value="custom">Custom</option>
              </select>
            </label>
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2>Schedule</h2>
            <p>Open the lobby, close registrations, and mark when the spotlight turns on.</p>
          </div>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Registration opens</span>
              <input
                type="datetime-local"
                value={form.registrationOpenAt}
                onChange={(eventObj) => handleChange('registrationOpenAt', eventObj.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Registration closes</span>
              <input
                type="datetime-local"
                value={form.registrationCloseAt}
                onChange={(eventObj) => handleChange('registrationCloseAt', eventObj.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>
                Event starts <span className={styles.requiredMark}>*</span>
              </span>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(eventObj) => handleChange('startAt', eventObj.target.value)}
                required
              />
            </label>
            <label className={styles.field}>
              <span>
                Event ends <span className={styles.requiredMark}>*</span>
              </span>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(eventObj) => handleChange('endAt', eventObj.target.value)}
                required
              />
            </label>
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2>Structure</h2>
            <p>Decide the squad size, total slots, and what players are competing for.</p>
          </div>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Team size</span>
              <input
                type="number"
                value={form.teamSize}
                onChange={(eventObj) => handleChange('teamSize', eventObj.target.value)}
                min={1}
              />
            </label>
            <label className={styles.field}>
              <span>Capacity</span>
              <input
                type="number"
                value={form.capacity}
                onChange={(eventObj) => handleChange('capacity', eventObj.target.value)}
                min={0}
              />
            </label>
            <label className={styles.field}>
              <span>Entry fee (₹)</span>
              <input
                type="number"
                value={form.entryFee}
                onChange={(eventObj) => handleChange('entryFee', eventObj.target.value)}
                min={0}
              />
            </label>
            <label className={styles.field}>
              <span>Prize pool</span>
              <input
                type="text"
                value={form.prizePool}
                onChange={(eventObj) => handleChange('prizePool', eventObj.target.value)}
              />
            </label>
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2>Experience</h2>
            <p>Set the arena, visuals, and how participants will join in.</p>
          </div>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Mode</span>
              <select value={form.mode} onChange={(eventObj) => handleChange('mode', eventObj.target.value as 'online' | 'venue')}>
                <option value="online">Online</option>
                <option value="venue">On-ground</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>
                Location <span className={styles.requiredMark}>*</span>
              </span>
              <input
                type="text"
                value={form.location}
                onChange={(eventObj) => {
                  handleChange('location', eventObj.target.value);
                  handleChange('venue', eventObj.target.value);
                }}
                required
                placeholder={form.mode === 'venue' ? 'Venue name or address' : 'Online event link or platform'}
              />
              <small className={styles.hintText}>
                Tell participants where to show up. Use "Online" for virtual events.
              </small>
            </label>
            <label className={styles.field}>
              <span>Banner URL</span>
              <input
                type="url"
                value={form.bannerUrl}
                onChange={(eventObj) => handleChange('bannerUrl', eventObj.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Cover URL</span>
              <input
                type="url"
                value={form.coverUrl}
                onChange={(eventObj) => handleChange('coverUrl', eventObj.target.value)}
              />
            </label>
          </div>
        </section>

        {mode === 'create' && (
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Registration form</h2>
              <p>Attach a saved form template so registrations are ready from day one.</p>
            </div>
            <div className={styles.stacked}>
              <label className={styles.field}>
                <span>Template</span>
                <select
                  value={selectedTemplateId}
                  onChange={(eventObj) => setSelectedTemplateId(eventObj.target.value)}
                  disabled={templatesLoading}
                >
                  <option value="">No template — configure later</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              {templatesLoading && (
                <p className={styles.templateNotice}>
                  <Loader2 size={16} className={styles.spin} /> Loading templates…
                </p>
              )}
              {templatesError && <p className={styles.error}>{templatesError}</p>}
              {!templatesLoading && !templatesError && templates.length === 0 && (
                <p className={styles.templateNotice}>
                  No templates yet. Build one to reuse common registration fields.
                </p>
              )}
              <div className={styles.templateActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => navigate(paths.admin.formTemplates())}
                >
                  Manage templates
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={templatesLoading}
                  onClick={() => void dispatch(listTemplates())}
                >
                  {templatesLoading ? <Loader2 size={16} className={styles.spin} /> : 'Refresh list'}
                </button>
              </div>
            </div>
          </section>
        )}

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2>Content</h2>
            <p>Describe the narrative and codify rules players must follow.</p>
          </div>
          <div className={styles.stacked}> 
            <label className={styles.field}>
              <span>Description</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(eventObj) => handleChange('description', eventObj.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Rules</span>
              <textarea rows={4} value={form.rules} onChange={(eventObj) => handleChange('rules', eventObj.target.value)} />
            </label>
            <label className={styles.field}>
              <span>Rewards</span>
              <textarea
                rows={3}
                value={form.rewards}
                onChange={(eventObj) => handleChange('rewards', eventObj.target.value)}
                placeholder={'Add one reward per line'}
              />
            </label>
            <label className={styles.field}>
              <span>Structure</span>
              <textarea
                rows={2}
                value={form.structure}
                onChange={(eventObj) => handleChange('structure', eventObj.target.value)}
                placeholder="How the rounds or matches will be organized"
              />
            </label>
          </div>
        </section>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.formFooter}>
          {mode === 'create' ? (
            <button type="button" className={styles.secondaryBtn} onClick={() => navigate(paths.admin.events.list())}>
              Cancel
            </button>
          ) : (
            <button type="button" className={styles.secondaryBtn} onClick={() => context?.refresh()}>
              Refresh
            </button>
          )}
          <button
            type="submit"
            className={styles.secondaryBtn}
            disabled={saving}
            onClick={() => setSubmitIntent('draft')}
          >
            {saving && !isPublishing ? <Loader2 className={styles.spin} /> : 'Save draft'}
          </button>
          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={saving}
            onClick={() => setSubmitIntent('publish')}
          >
            {saving && isPublishing ? <Loader2 className={styles.spin} /> : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminEventEditor;
