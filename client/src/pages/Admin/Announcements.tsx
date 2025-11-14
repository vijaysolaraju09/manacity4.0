import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Textarea from '@/components/ui/textarea';
import EmptyState from '@/components/ui/EmptyState';
import showToast from '@/components/ui/Toast';
import { adminHttp } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';
import { cn } from '@/lib/utils';
import styles from './Banners/Banners.module.scss';

type Announcement = {
  _id: string;
  title: string;
  text: string;
  image?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  active: boolean;
  createdAt?: string;
};

type FormValues = {
  title: string;
  text: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  active: boolean;
};

const defaultValues: FormValues = {
  title: '',
  text: '',
  image: '',
  ctaText: '',
  ctaLink: '',
  active: true,
};

const normalizeAnnouncement = (item: Announcement): FormValues => ({
  title: item.title ?? '',
  text: item.text ?? '',
  image: item.image ?? '',
  ctaText: item.ctaText ?? '',
  ctaLink: item.ctaLink ?? '',
  active: Boolean(item.active),
});

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({ defaultValues });

  const activeValue = watch('active');

  const sortedAnnouncements = useMemo(
    () =>
      [...announcements].sort((a, b) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        const aTime = new Date(a.createdAt ?? 0).getTime();
        const bTime = new Date(b.createdAt ?? 0).getTime();
        return bTime - aTime;
      }),
    [announcements],
  );

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminHttp.get('/admin/announcements');
      const items = (response?.data?.items ?? response?.data?.data ?? []) as Announcement[];
      setAnnouncements(Array.isArray(items) ? items : []);
    } catch (err) {
      setAnnouncements([]);
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  const resetForm = useCallback(() => {
    setSelectedId(null);
    reset(defaultValues);
  }, [reset]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const payload = {
        title: values.title.trim(),
        text: values.text.trim(),
        image: values.image.trim() || null,
        ctaText: values.ctaText.trim() || null,
        ctaLink: values.ctaLink.trim() || null,
        active: values.active,
      };

      if (!payload.title || !payload.text) {
        showToast('Title and message are required', 'error');
        return;
      }

      setSaving(true);
      try {
        if (selectedId) {
          await adminHttp.patch(`/admin/announcements/${selectedId}`, payload);
          showToast('Announcement updated', 'success');
        } else {
          await adminHttp.post('/admin/announcements', payload);
          showToast('Announcement published', 'success');
        }
        await loadAnnouncements();
        if (selectedId) {
          reset({
            title: payload.title,
            text: payload.text,
            image: payload.image ?? '',
            ctaText: payload.ctaText ?? '',
            ctaLink: payload.ctaLink ?? '',
            active: payload.active,
          });
        } else {
          reset(defaultValues);
        }
      } catch (err) {
        showToast(toErrorMessage(err), 'error');
      } finally {
        setSaving(false);
      }
    },
    [loadAnnouncements, reset, selectedId],
  );

  const handleEdit = useCallback(
    (item: Announcement) => {
      setSelectedId(item._id);
      reset(normalizeAnnouncement(item));
    },
    [reset],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!id) return;
      if (!window.confirm('Delete this announcement?')) return;
      setSaving(true);
      try {
        await adminHttp.delete(`/admin/announcements/${id}`);
        showToast('Announcement removed', 'success');
        await loadAnnouncements();
        if (selectedId === id) {
          resetForm();
        }
      } catch (err) {
        showToast(toErrorMessage(err), 'error');
      } finally {
        setSaving(false);
      }
    },
    [loadAnnouncements, resetForm, selectedId],
  );

  const handleToggle = useCallback(
    async (id: string, active: boolean) => {
      setSaving(true);
      try {
        await adminHttp.patch(`/admin/announcements/${id}`, { active });
        showToast(active ? 'Announcement activated' : 'Announcement paused', 'success');
        await loadAnnouncements();
        if (selectedId === id) {
          setValue('active', active, { shouldDirty: true, shouldTouch: true });
        }
      } catch (err) {
        showToast(toErrorMessage(err), 'error');
      } finally {
        setSaving(false);
      }
    },
    [loadAnnouncements, reset, selectedId],
  );

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {selectedId ? 'Edit announcement' : 'Create announcement'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Publish news, emergency alerts, and service updates. Title and message are mandatory.
            </p>
          </div>
          {selectedId ? (
            <Button
              type="button"
              variant="ghost"
              onClick={resetForm}
              disabled={saving || isSubmitting}
              className="text-slate-600 hover:text-slate-900"
            >
              New announcement
            </Button>
          ) : null}
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Title *</span>
              <Input
                {...register('title', {
                  required: 'Title is required',
                  minLength: { value: 3, message: 'Title must be at least 3 characters' },
                })}
                name="title"
                placeholder="City-wide update"
                autoComplete="off"
              />
              {errors.title ? (
                <span className="text-xs text-red-600">{errors.title.message}</span>
              ) : null}
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">CTA text</span>
              <Input
                {...register('ctaText', {
                  maxLength: { value: 80, message: 'CTA text must be under 80 characters' },
                })}
                placeholder="Learn more"
              />
              {errors.ctaText ? (
                <span className="text-xs text-red-600">{errors.ctaText.message}</span>
              ) : null}
            </label>
          </div>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Message *</span>
            <Textarea
              rows={5}
              {...register('text', {
                required: 'Message is required',
                minLength: { value: 10, message: 'Message must be at least 10 characters' },
              })}
              placeholder="Describe the announcement"
            />
            {errors.text ? <span className="text-xs text-red-600">{errors.text.message}</span> : null}
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Image URL</span>
              <Input
                {...register('image', {
                  pattern: {
                    value: /^(https?:\/\/).*/iu,
                    message: 'Enter a valid URL starting with http or https',
                  },
                })}
                placeholder="https://..."
              />
              {errors.image ? <span className="text-xs text-red-600">{errors.image.message}</span> : null}
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">CTA link</span>
              <Input
                {...register('ctaLink', {
                  validate: (value) => {
                    if (!value) return true;
                    if (value.startsWith('/')) return true;
                    return /^(https?:\/\/).*/iu.test(value) || 'Enter an internal path or full URL';
                  },
                })}
                placeholder="/specials or https://"
              />
              {errors.ctaLink ? <span className="text-xs text-red-600">{errors.ctaLink.message}</span> : null}
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              {...register('active')}
              checked={activeValue}
              onChange={(event) => {
                const { checked } = event.target;
                setValue('active', checked, { shouldDirty: true, shouldTouch: true });
              }}
              className="h-4 w-4 rounded border-slate-300 text-[color:var(--brand-600)] focus:ring-[color:var(--brand-500)]"
            />
            Active
          </label>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting || saving}>
              {selectedId ? 'Save changes' : 'Publish announcement'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={resetForm}
              disabled={isSubmitting || saving || !isDirty}
            >
              Reset
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Announcements</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadAnnouncements()}
            disabled={loading || saving}
          >
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
            <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadAnnouncements()}>
                Retry
              </Button>
            </div>
          </div>
        ) : sortedAnnouncements.length === 0 ? (
          <EmptyState message="No announcements yet" ctaLabel="Create one" onCtaClick={resetForm} />
        ) : (
          <div className={cn(styles.grid, 'mt-2')}>
            {sortedAnnouncements.map((item) => (
              <article key={item._id} className={cn(styles.tile, 'space-y-3')}>
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    className={styles.img}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.style.visibility = 'hidden';
                    }}
                  />
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      item.active ? 'text-green-600' : 'text-slate-500',
                    )}
                  >
                    {item.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{item.text}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                    disabled={saving || isSubmitting}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleToggle(item._id, !item.active)}
                    disabled={saving || isSubmitting}
                  >
                    {item.active ? 'Deactivate' : 'Set active'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDelete(item._id)}
                    disabled={saving || isSubmitting}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminAnnouncements;
