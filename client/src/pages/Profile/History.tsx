import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquare, Star, X } from 'lucide-react';

import {
  fetchHistory,
  submitFeedback,
  type HistoryEntry,
  type HistoryEntryType,
} from '@/api/history';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Badge, { type BadgeVariant } from '@/components/ui/badge';
import ErrorCard from '@/components/ui/ErrorCard';
import { Textarea } from '@/components/ui/textarea';
import showToast from '@/components/ui/Toast';
import { toErrorMessage } from '@/lib/response';
import { cn } from '@/lib/utils';
import { paths } from '@/routes/paths';
import { formatINR } from '@/utils/currency';
import { formatLocaleDateTime } from '@/utils/date';
import styles from '@/styles/PageShell.module.scss';

const typeLabels: Record<HistoryEntryType, string> = {
  order: 'Order',
  service_request: 'Service request',
  event: 'Event',
};

const resolveStatusVariant = (status: string): BadgeVariant => {
  const normalized = status.toLowerCase();
  if (['delivered', 'completed', 'closed', 'checked_in'].some((value) => normalized.includes(value))) {
    return 'success';
  }
  if (['cancelled', 'canceled', 'rejected', 'returned'].some((value) => normalized.includes(value))) {
    return 'danger';
  }
  if (['in_progress', 'ongoing', 'assigned'].some((value) => normalized.includes(value))) {
    return 'warning';
  }
  return 'secondary';
};

const toDisplayStatus = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const FeedbackDialog = ({
  entry,
  rating,
  comment,
  busy,
  onRatingChange,
  onCommentChange,
  onClose,
  onSubmit,
}: {
  entry: HistoryEntry;
  rating: number | null;
  comment: string;
  busy: boolean;
  onRatingChange: (value: number | null) => void;
  onCommentChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) => {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-3xl border border-slate-200/60 bg-white p-6 shadow-2xl dark:border-slate-800/60 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">
              {typeLabels[entry.type]}
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Share your feedback</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 py-5">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.title}</p>
            {entry.description ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">{entry.description}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Rating</span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Select rating">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  const selected = typeof rating === 'number' ? rating >= value : false;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        'inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm transition',
                        selected
                          ? 'border-amber-400 bg-amber-100 text-amber-600 dark:border-amber-500/60 dark:bg-amber-500/20 dark:text-amber-300'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                      )}
                      onClick={() => onRatingChange(selected && rating === value ? null : value)}
                      disabled={busy}
                      aria-label={`Rate ${value} star${value === 1 ? '' : 's'}`}
                      role="radio"
                      aria-checked={selected}
                    >
                      <Star
                        className="h-4 w-4"
                        aria-hidden="true"
                        strokeWidth={1.5}
                        fill={selected ? 'currentColor' : 'none'}
                      />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => onRatingChange(null)}
                disabled={busy || rating === null}
                className="text-xs font-medium text-slate-500 transition hover:text-rose-500 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-slate-400 dark:hover:text-rose-400"
              >
                Clear rating
              </button>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Comments</span>
            <Textarea
              value={comment}
              disabled={busy}
              onChange={(event) => onCommentChange(event.target.value)}
              placeholder="Tell us more about your experience"
              className="min-h-[120px] resize-vertical"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
              </span>
            ) : (
              'Submit feedback'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<HistoryEntry | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchHistory();
      setEntries(data);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleOpenFeedback = useCallback((entry: HistoryEntry) => {
    setFeedbackTarget(entry);
    setFeedbackRating(entry.feedback?.rating ?? null);
    setFeedbackComment(entry.feedback?.comment ?? '');
  }, []);

  const handleFeedbackSubmit = useCallback(async () => {
    if (!feedbackTarget) return;
    try {
      setFeedbackBusy(true);
      const trimmedComment = feedbackComment.trim();
      const previousComment = feedbackTarget.feedback?.comment ?? '';
      const commentChanged = trimmedComment !== previousComment;
      const previousRating = feedbackTarget.feedback?.rating ?? null;
      const nextRating = feedbackRating ?? null;
      const ratingChanged = nextRating !== previousRating;
      const payload = {
        entityType: feedbackTarget.type,
        entityId: feedbackTarget.referenceId,
        rating: ratingChanged ? nextRating : undefined,
        comment: commentChanged ? trimmedComment : undefined,
      };
      const feedback = await submitFeedback(payload);
      setEntries((current) =>
        current.map((entry) =>
          entry.id === feedbackTarget.id
            ? {
                ...entry,
                feedback: {
                  rating: feedback.rating ?? feedbackRating ?? null,
                  comment:
                    typeof feedback.comment === 'string'
                      ? feedback.comment
                      : feedbackComment.trim() || null,
                  updatedAt: feedback.updatedAt,
                },
              }
            : entry,
        ),
      );
      showToast('Feedback saved. Thank you!', 'success');
      setFeedbackTarget(null);
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    } finally {
      setFeedbackBusy(false);
    }
  }, [feedbackComment, feedbackRating, feedbackTarget]);

  const handleView = useCallback(
    (entry: HistoryEntry) => {
      if (entry.type === 'order') {
        navigate(paths.orders.detail(entry.referenceId));
        return;
      }
      if (entry.type === 'event') {
        navigate(paths.events.detail(entry.referenceId));
        return;
      }
      navigate(paths.services.requestsMine());
    },
    [navigate],
  );

  const emptyState = useMemo(() => (
    <Card className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-500/10 via-white/90 to-white/70 p-10 text-center shadow-2xl shadow-indigo-200/40 backdrop-blur-xl dark:border-indigo-500/30 dark:bg-slate-950/70 dark:shadow-indigo-900/40">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">No activity yet</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Orders, service requests and event registrations will appear here once you start using the app.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button onClick={() => navigate(paths.orders.mine())}>Browse orders</Button>
        <Button variant="outline" onClick={() => navigate(paths.services.requestsMine())}>
          Manage requests
        </Button>
      </div>
    </Card>
  ), [navigate]);

  return (
    <main className={cn(styles.pageShell, 'bg-transparent text-slate-900 dark:text-slate-100')}>
      <div className={cn(styles.pageShell__inner, 'mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6')}>
        <div className="flex flex-col gap-4 pb-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Activity history
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Track your recent orders, service requests and event participation in one place.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Refreshing…
                </span>
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </div>

        {error ? (
          <ErrorCard title="Unable to load history" message={error} onRetry={() => void refresh()} />
        ) : loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-3xl border border-slate-200/70 bg-white/80 shadow-lg shadow-slate-200/60 dark:border-slate-800/70 dark:bg-slate-900/70"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          emptyState
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const totalPaise = entry.metadata?.totalPaise;
              const hasTotal = typeof totalPaise === 'number' && Number.isFinite(totalPaise);
              const resolvedTotalPaise = hasTotal ? (totalPaise as number) : null;
              const itemCount = entry.metadata?.itemCount ?? null;
              return (
                <Card
                  key={entry.id}
                  className="rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{typeLabels[entry.type]}</Badge>
                        <Badge variant={resolveStatusVariant(entry.status)}>
                          {toDisplayStatus(entry.status)}
                        </Badge>
                        {itemCount ? (
                          <Badge variant="secondary">{itemCount} item{itemCount === 1 ? '' : 's'}</Badge>
                        ) : null}
                      </div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{entry.title}</h2>
                      {entry.description ? (
                        <p className="text-sm text-slate-600 dark:text-slate-300">{entry.description}</p>
                      ) : null}
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatLocaleDateTime(entry.occurredAt, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      {hasTotal && resolvedTotalPaise !== null ? (
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {formatINR(resolvedTotalPaise)}
                        </span>
                      ) : null}
                      {entry.metadata?.orderCode ? (
                        <span className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                          #{entry.metadata.orderCode}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {entry.feedback?.rating || entry.feedback?.comment ? (
                    <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800/70 dark:bg-slate-800/40 dark:text-slate-200">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-100">
                        <Star className="h-4 w-4 text-amber-500" aria-hidden="true" />
                        {entry.feedback?.rating ? `${entry.feedback.rating} / 5` : 'Feedback submitted'}
                      </div>
                      {entry.feedback?.comment ? (
                        <p className="mt-2 flex items-start gap-2 text-sm">
                          <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
                          <span>{entry.feedback.comment}</span>
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => handleView(entry)}>
                      View details
                    </Button>
                    {entry.canFeedback ? (
                      <Button onClick={() => handleOpenFeedback(entry)}>
                        {entry.feedback ? 'Update feedback' : 'Give feedback'}
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {feedbackTarget ? (
        <FeedbackDialog
          entry={feedbackTarget}
          rating={feedbackRating}
          comment={feedbackComment}
          busy={feedbackBusy}
          onRatingChange={setFeedbackRating}
          onCommentChange={setFeedbackComment}
          onClose={() => {
            if (!feedbackBusy) {
              setFeedbackTarget(null);
            }
          }}
          onSubmit={handleFeedbackSubmit}
        />
      ) : null}
    </main>
  );
};

export default HistoryPage;
