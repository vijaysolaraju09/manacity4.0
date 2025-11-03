import { useCallback, useEffect, useMemo, useState, type FormEventHandler } from 'react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Textarea from '@/components/ui/textarea';
import EmptyState from '@/components/ui/EmptyState';
import showToast from '@/components/ui/Toast';
import { adminHttp } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';
import { cn } from '@/lib/utils';
import styles from './Banners.module.scss';

interface Announcement {
  _id: string;
  title: string;
  text: string;
  image?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  active: boolean;
  createdAt?: string;
}

type FormState = {
  title: string;
  text: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  active: boolean;
};

const emptyForm: FormState = {
  title: '',
  text: '',
  image: '',
  ctaText: '',
  ctaLink: '',
  active: true,
};

const AdminBanners = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedAnnouncements = useMemo(
    () =>
      [...announcements].sort((a, b) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      }),
    [announcements]
  );

  const resetForm = useCallback(() => {
    setSelectedId(null);
    setForm(emptyForm);
  }, []);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminHttp.get('/admin/announcements');
      const items = (res?.data?.items ?? []) as Announcement[];
      setAnnouncements(items);
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

  const handleInputChange = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleEdit = useCallback((item: Announcement) => {
    setSelectedId(item._id);
    setForm({
      title: item.title,
      text: item.text,
      image: item.image ?? '',
      ctaText: item.ctaText ?? '',
      ctaLink: item.ctaLink ?? '',
      active: item.active,
    });
  }, []);

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();
      if (!form.title.trim() || !form.text.trim()) {
        showToast('Title and message are required', 'error');
        return;
      }

      const payload = {
        title: form.title.trim(),
        text: form.text.trim(),
        image: form.image.trim() || null,
        ctaText: form.ctaText.trim() || null,
        ctaLink: form.ctaLink.trim() || null,
        active: form.active,
      };

      setSaving(true);
      try {
        if (selectedId) {
          await adminHttp.patch(`/admin/announcements/${selectedId}`, payload);
          showToast('Announcement updated', 'success');
        } else {
          await adminHttp.post('/admin/announcements', payload);
          showToast('Announcement created', 'success');
        }
        await loadAnnouncements();
        resetForm();
      } catch (err) {
        showToast(toErrorMessage(err), 'error');
      } finally {
        setSaving(false);
      }
    },
    [form, loadAnnouncements, resetForm, selectedId]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!id) return;
      const shouldDelete = window.confirm('Delete this announcement?');
      if (!shouldDelete) return;

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
    [loadAnnouncements, resetForm, selectedId]
  );

  const handleToggle = useCallback(
    async (id: string, active: boolean) => {
      setSaving(true);
      try {
        await adminHttp.patch(`/admin/announcements/${id}`, { active });
        showToast(active ? 'Announcement activated' : 'Announcement deactivated', 'success');
        await loadAnnouncements();
        if (selectedId === id) {
          setForm((prev) => ({ ...prev, active }));
        }
      } catch (err) {
        showToast(toErrorMessage(err), 'error');
      } finally {
        setSaving(false);
      }
    },
    [loadAnnouncements, selectedId]
  );

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-borderc/40 bg-surface-1 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              {selectedId ? 'Edit announcement' : 'Create announcement'}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Share timely updates with the community. Images and call-to-action details are optional.
            </p>
          </div>
          {selectedId && (
            <Button
              type="button"
              variant="ghost"
              onClick={resetForm}
              disabled={saving}
              className="text-text-secondary hover:text-text-primary"
            >
              New
            </Button>
          )}
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-text-secondary">Title *</span>
              <Input
                value={form.title}
                onChange={(event) => handleInputChange('title', event.target.value)}
                placeholder="City-wide update"
                required
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-text-secondary">CTA text</span>
              <Input
                value={form.ctaText}
                onChange={(event) => handleInputChange('ctaText', event.target.value)}
                placeholder="Learn more"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-text-secondary">Message *</span>
            <Textarea
              rows={5}
              value={form.text}
              onChange={(event) => handleInputChange('text', event.target.value)}
              placeholder="Describe the announcement"
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-text-secondary">Image URL</span>
              <Input
                value={form.image}
                onChange={(event) => handleInputChange('image', event.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-text-secondary">CTA link</span>
              <Input
                value={form.ctaLink}
                onChange={(event) => handleInputChange('ctaLink', event.target.value)}
                placeholder="/specials or https://"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-borderc/40 text-[color:var(--brand-600)] focus:ring-[color:var(--brand-500)]"
              checked={form.active}
              onChange={(event) => handleInputChange('active', event.target.checked)}
            />
            Active
          </label>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {selectedId ? 'Save changes' : 'Publish announcement'}
            </Button>
            <Button type="button" variant="secondary" onClick={resetForm} disabled={saving}>
              Clear
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">Announcements</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void loadAnnouncements();
            }}
            disabled={loading || saving}
          >
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-32 animate-pulse rounded-2xl border border-borderc/40 bg-surface-2" />
            <div className="h-32 animate-pulse rounded-2xl border border-borderc/40 bg-surface-2" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void loadAnnouncements();
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : sortedAnnouncements.length === 0 ? (
          <EmptyState message="No announcements yet" ctaLabel="Create one" onCtaClick={resetForm} />
        ) : (
          <div className={cn(styles.grid, 'mt-2')}>
            {sortedAnnouncements.map((item) => (
              <div key={item._id} className={cn(styles.tile, 'space-y-3')}>
                {item.image && (
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
                )}
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-text-primary">{item.title}</h3>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      item.active ? 'text-green-600' : 'text-text-muted'
                    )}
                  >
                    {item.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">{item.text}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                    disabled={saving}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleToggle(item._id, !item.active)}
                    disabled={saving}
                  >
                    {item.active ? 'Deactivate' : 'Set active'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(item._id)}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminBanners;
