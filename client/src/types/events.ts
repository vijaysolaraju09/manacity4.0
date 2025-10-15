export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'canceled';
export type EventType = 'tournament' | 'activity';
export type EventFormat =
  | 'single_elim'
  | 'double_elim'
  | 'round_robin'
  | 'points'
  | 'single_match'
  | 'custom';

export interface EventSummary {
  _id: string;
  title: string;
  type: EventType;
  category: string;
  format: EventFormat;
  teamSize: number;
  maxParticipants: number;
  registeredCount: number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  startAt: string;
  endAt?: string | null;
  status: EventStatus;
  mode: 'online' | 'venue';
  venue?: string | null;
  visibility: 'public' | 'private';
  bannerUrl?: string | null;
  lifecycleStatus?: 'upcoming' | 'ongoing' | 'past';
}

export interface EventDetail extends EventSummary {
  timezone: string;
  description: string;
  rules: string;
  prizePool?: string | null;
  coverUrl?: string | null;
  updatesCount?: number;
  leaderboardVersion?: number;
  isRegistrationOpen?: boolean;
  registration?: EventRegistration | null;
}

export interface EventRegistration {
  _id: string;
  status: 'registered' | 'waitlisted' | 'checked_in' | 'withdrawn' | 'disqualified';
  teamName?: string;
}

const deriveLifecycleStatus = (summary: EventSummary): 'upcoming' | 'ongoing' | 'past' => {
  const now = Date.now();
  const startTime = Date.parse(summary.startAt);
  const endTime = summary.endAt ? Date.parse(summary.endAt) : Number.NaN;

  if (
    summary.status === 'completed' ||
    summary.status === 'canceled' ||
    (Number.isFinite(endTime) && endTime < now)
  ) {
    return 'past';
  }

  if (
    summary.status === 'ongoing' ||
    (Number.isFinite(startTime) && startTime <= now && (!Number.isFinite(endTime) || endTime >= now))
  ) {
    return 'ongoing';
  }

  return 'upcoming';
};

export const adaptEventSummary = (raw: any): EventSummary | null => {
  if (!raw) return null;

  const lifecycleRaw =
    typeof raw.lifecycleStatus === 'string'
      ? raw.lifecycleStatus
      : typeof raw.lifecycle_status === 'string'
      ? raw.lifecycle_status
      : '';

  const summary: EventSummary = {
    _id: raw._id || raw.id,
    title: raw.title || '',
    type: (raw.type as EventType) || 'activity',
    category: raw.category || 'other',
    format: (raw.format as EventFormat) || 'single_match',
    teamSize: Number(raw.teamSize) || 1,
    maxParticipants: Number(raw.maxParticipants) || 0,
    registeredCount: Number(raw.registeredCount) || 0,
    registrationOpenAt:
      raw.registrationOpenAt || raw.registration_open_at || raw.startAt || new Date().toISOString(),
    registrationCloseAt:
      raw.registrationCloseAt || raw.registration_close_at || raw.startAt || new Date().toISOString(),
    startAt: raw.startAt || raw.start_date || new Date().toISOString(),
    endAt: raw.endAt || raw.end_date || null,
    status: (raw.status as EventStatus) || 'draft',
    mode: raw.mode === 'venue' ? 'venue' : 'online',
    venue: raw.venue || null,
    visibility: raw.visibility === 'private' ? 'private' : 'public',
    bannerUrl: raw.bannerUrl || raw.cover || null,
  };

  const normalizedLifecycle = lifecycleRaw.toLowerCase();
  if (['upcoming', 'ongoing', 'past'].includes(normalizedLifecycle)) {
    summary.lifecycleStatus = normalizedLifecycle as 'upcoming' | 'ongoing' | 'past';
  } else {
    summary.lifecycleStatus = deriveLifecycleStatus(summary);
  }

  return summary;
};

export const adaptEventDetail = (raw: any): EventDetail | null => {
  const summary = adaptEventSummary(raw);
  if (!summary) return null;
  return {
    ...summary,
    timezone: raw.timezone || 'Asia/Kolkata',
    description: raw.description || '',
    rules: raw.rules || '',
    prizePool: raw.prizePool || null,
    coverUrl: raw.coverUrl || raw.cover || null,
    updatesCount: raw.updatesCount ?? 0,
    leaderboardVersion: raw.leaderboardVersion ?? 0,
    isRegistrationOpen: !!raw.isRegistrationOpen,
    registration: raw.registration || null,
  };
};
