export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'canceled';
export type EventType = 'tournament' | 'activity';
export type EventFormat =
  | 'single_elim'
  | 'double_elim'
  | 'round_robin'
  | 'points'
  | 'single_match'
  | 'custom';

export interface EventRegistrationMeta {
  status?: string | null;
  paymentRequired?: boolean;
  paymentAmount?: number | null;
  paymentCurrency?: string | null;
  paymentProofUrl?: string | null;
  submittedAt?: string | null;
}

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
  regOpenAt?: string | null;
  regCloseAt?: string | null;
  startAt: string;
  endAt?: string | null;
  status: EventStatus;
  mode: 'online' | 'venue';
  venue?: string | null;
  visibility: 'public' | 'private';
  bannerUrl?: string | null;
  lifecycleStatus?: 'upcoming' | 'ongoing' | 'past';
  entryFee?: number;
  entryFeePaise?: number;
  prizePool?: string | null;
  featured?: boolean;
  highlightLabel?: string | null;
  shortDescription?: string | null;
  accentColor?: string | null;
  iconUrl?: string | null;
  registration?: EventRegistrationMeta | null;
  registrationStatus?: string | null;
  myRegistrationStatus?: string | null;
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
  registration?: (EventRegistration & EventRegistrationMeta) | null;
  rewards?: string[];
  structure?: 'solo' | 'team' | string;
  registrationChecklist?: string[];
  contact?: { name?: string; phone?: string; email?: string } | null;
  livestreamUrl?: string | null;
  venueMapUrl?: string | null;
}

export interface EventRegistrationSummary {
  _id: string;
  status: EventRegistration['status'];
  teamName?: string | null;
  user?: { _id: string; name?: string | null } | null;
  members?: Array<{ name: string; contact?: string | null }>;
  createdAt?: string;
}

export interface EventUpdate {
  _id: string;
  type: 'pre' | 'live' | 'post' | 'alert';
  message: string;
  postedBy?: string | null;
  isPinned?: boolean;
  createdAt: string;
  linkUrl?: string | null;
}

export interface EventLeaderboardEntry {
  _id?: string;
  participantId?: string;
  teamName?: string;
  user?: string;
  score?: number;
  points?: number;
  rank?: number;
  wins?: number;
  losses?: number;
  kills?: number;
  time?: number;
}

export interface EventRegistration {
  _id: string;
  status: 'registered' | 'waitlisted' | 'checked_in' | 'withdrawn' | 'disqualified';
  teamName?: string;
  payment?: {
    required?: boolean;
    amount?: number;
    currency?: string;
    proofUrl?: string | null;
  } | null;
  proofUrl?: string | null;
  createdAt?: string;
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
    regOpenAt:
      raw.regOpenAt || raw.registrationOpenAt || raw.registration_open_at || raw.startAt || null,
    regCloseAt:
      raw.regCloseAt || raw.registrationCloseAt || raw.registration_close_at || raw.startAt || null,
    startAt: raw.startAt || raw.start_date || new Date().toISOString(),
    endAt: raw.endAt || raw.end_date || null,
    status: (raw.status as EventStatus) || 'draft',
    mode: raw.mode === 'venue' ? 'venue' : 'online',
    venue: raw.venue || null,
    visibility: raw.visibility === 'private' ? 'private' : 'public',
    bannerUrl: raw.bannerUrl || raw.cover || null,
    prizePool: raw.prizePool ?? raw.prize_pool ?? raw.rewards ?? null,
    shortDescription: raw.shortDescription ?? raw.subtitle ?? null,
    featured: Boolean(raw.featured ?? raw.isFeatured ?? raw.highlighted),
    highlightLabel: raw.highlightLabel ?? raw.tagline ?? null,
    accentColor: raw.accentColor ?? raw.themeColor ?? null,
    iconUrl: raw.iconUrl ?? raw.gameIcon ?? null,
  };

  const entryFeePaiseCandidate = Number(
    raw.entryFeePaise ?? raw.entry_fee_paise ?? raw.entry_fee_paise ?? raw.entryFeePaise
  );
  const entryFeeCandidate = Number(raw.entryFee ?? raw.entry_fee ?? raw.price ?? raw.fee);
  if (Number.isFinite(entryFeePaiseCandidate) && entryFeePaiseCandidate >= 0) {
    summary.entryFeePaise = entryFeePaiseCandidate;
    summary.entryFee = Math.round(entryFeePaiseCandidate / 100);
  } else if (Number.isFinite(entryFeeCandidate) && entryFeeCandidate >= 0) {
    summary.entryFee = entryFeeCandidate;
    summary.entryFeePaise = entryFeeCandidate * 100;
  } else {
    summary.entryFee = 0;
    summary.entryFeePaise = 0;
  }

  const normalizedLifecycle = lifecycleRaw.toLowerCase();
  if (['upcoming', 'ongoing', 'past'].includes(normalizedLifecycle)) {
    summary.lifecycleStatus = normalizedLifecycle as 'upcoming' | 'ongoing' | 'past';
  } else {
    summary.lifecycleStatus = deriveLifecycleStatus(summary);
  }

  const registrationInfo = raw.registration ?? raw.registrationStatus ?? raw.myRegistration;
  if (registrationInfo && typeof registrationInfo === 'object') {
    const status =
      registrationInfo.status ??
      registrationInfo.state ??
      raw.registrationStatus ??
      raw.myRegistrationStatus ??
      null;
    const paymentSource =
      registrationInfo.payment ??
      raw.registrationPayment ??
      raw.payment ??
      raw.paymentInfo ??
      null;
    const paymentProof =
      registrationInfo.paymentProofUrl ??
      registrationInfo.proofUrl ??
      paymentSource?.proofUrl ??
      raw.registrationProofUrl ??
      raw.paymentProofUrl ??
      null;
    const paymentAmount =
      typeof registrationInfo.paymentAmount === 'number'
        ? registrationInfo.paymentAmount
        : typeof paymentSource?.amount === 'number'
        ? paymentSource.amount
        : null;
    const paymentCurrency =
      typeof registrationInfo.paymentCurrency === 'string'
        ? registrationInfo.paymentCurrency
        : typeof paymentSource?.currency === 'string'
        ? paymentSource.currency
        : null;
    const paymentRequired =
      typeof registrationInfo.paymentRequired === 'boolean'
        ? registrationInfo.paymentRequired
        : typeof paymentSource?.required === 'boolean'
        ? paymentSource.required
        : undefined;
    const submittedAt =
      typeof registrationInfo.submittedAt === 'string'
        ? registrationInfo.submittedAt
        : typeof registrationInfo.createdAt === 'string'
        ? registrationInfo.createdAt
        : null;
    summary.registration = {
      status: status ?? null,
      paymentRequired,
      paymentAmount,
      paymentCurrency,
      paymentProofUrl: typeof paymentProof === 'string' ? paymentProof : null,
      submittedAt,
    };
    if (status) {
      summary.registrationStatus = status;
      summary.myRegistrationStatus = status;
    }
  } else if (typeof registrationInfo === 'string') {
    summary.registration = { status: registrationInfo };
    summary.registrationStatus = registrationInfo;
    summary.myRegistrationStatus = registrationInfo;
  } else {
    const status =
      raw.registrationStatus ??
      raw.myRegistrationStatus ??
      raw.my_registration_status ??
      raw.registration_status ??
      null;
    if (status) {
      summary.registration = { status };
      summary.registrationStatus = status;
      summary.myRegistrationStatus = status;
    }
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
    rewards: Array.isArray(raw.rewards)
      ? raw.rewards
          .map((item: any) => (typeof item === 'string' ? item : item?.label))
          .filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
      : undefined,
    structure: raw.structure ?? (summary.teamSize > 1 ? 'team' : 'solo'),
    registrationChecklist: Array.isArray(raw.registrationChecklist)
      ? raw.registrationChecklist.filter((item: any): item is string => typeof item === 'string')
      : undefined,
    contact: raw.contact
      ? {
          name: raw.contact.name ?? raw.contact.person ?? undefined,
          phone: raw.contact.phone ?? raw.contact.mobile ?? undefined,
          email: raw.contact.email ?? undefined,
        }
      : null,
    livestreamUrl: raw.livestreamUrl ?? raw.streamUrl ?? null,
    venueMapUrl: raw.venueMapUrl ?? raw.mapUrl ?? null,
  };
};

export const adaptEventRegistrationSummary = (raw: any): EventRegistrationSummary | null => {
  if (!raw) return null;
  const status = (raw.status || 'registered') as EventRegistration['status'];
  const teamName = raw.teamName ?? raw.team_name ?? raw.name ?? null;
  const members = Array.isArray(raw.members)
    ? raw.members
        .map((member: unknown) => {
          if (!member || typeof member !== 'object') {
            return { name: null, contact: null };
          }
          const record = member as Record<string, unknown>;
          const name =
            typeof record.name === 'string'
              ? record.name
              : typeof record.displayName === 'string'
              ? record.displayName
              : null;
          const contact =
            typeof record.contact === 'string'
              ? record.contact
              : typeof record.phone === 'string'
              ? record.phone
              : typeof record.mobile === 'string'
              ? record.mobile
              : null;
          return { name, contact };
        })
        .filter(
          (
            member: { name: string | null; contact: string | null },
          ): member is { name: string; contact: string | null } =>
            typeof member.name === 'string' && member.name.trim().length > 0,
        )
    : undefined;
  const fallbackId = `reg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    _id: String(raw._id ?? raw.id ?? fallbackId),
    status,
    teamName: typeof teamName === 'string' ? teamName : undefined,
    user: raw.user
      ? { _id: String(raw.user._id ?? raw.user.id ?? ''), name: raw.user.name ?? raw.user.username ?? null }
      : null,
    members,
    createdAt: raw.createdAt ?? raw.created_at ?? undefined,
  };
};

export const adaptEventUpdate = (raw: any): EventUpdate | null => {
  if (!raw) return null;
  const message = raw.message ?? raw.text ?? '';
  if (!message) return null;
  const fallbackId = `update-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    _id: String(raw._id ?? raw.id ?? fallbackId),
    type: (raw.type || 'pre') as EventUpdate['type'],
    message,
    postedBy: raw.postedBy?.name ?? raw.postedBy?.username ?? raw.author ?? null,
    isPinned: Boolean(raw.isPinned ?? raw.pinned),
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    linkUrl: raw.linkUrl ?? raw.link ?? null,
  };
};

export const adaptEventLeaderboardEntry = (raw: any): EventLeaderboardEntry | null => {
  if (!raw) return null;
  const resolvedScore = Number(raw.score ?? raw.points ?? raw.total ?? 0) || 0;
  return {
    _id: raw._id ?? raw.id ?? undefined,
    participantId: raw.participantId ?? raw.participant_id ?? raw.registrationId ?? undefined,
    teamName: raw.teamName ?? raw.team ?? raw.player ?? undefined,
    user: raw.user ?? raw.username ?? raw.playerName ?? undefined,
    score: resolvedScore,
    points: resolvedScore,
    rank: Number(raw.rank ?? raw.position) || undefined,
    wins: Number(raw.wins ?? raw.win) || undefined,
    losses: Number(raw.losses ?? raw.loss) || undefined,
    kills: Number(raw.kills ?? raw.frags) || undefined,
    time: Number(raw.time ?? raw.duration) || undefined,
  };
};

export interface EventTileView {
  id: string;
  title: string;
  banner: string | null;
  status: EventStatus;
  entryType: 'free' | 'paid';
  entryFee?: number;
  category: string;
  participants: number;
  maxParticipants?: number;
  prizePool?: string | null;
  startAt: string;
  endAt?: string | null;
}

export interface EventDetailView extends EventDetail {
  isLive: boolean;
  isUpcoming: boolean;
  isCompleted: boolean;
  entryType: 'free' | 'paid';
  entryFeeAmount?: number;
}

export const toEventTile = (raw: any): EventTileView | null => {
  const summary = adaptEventSummary(raw);
  if (!summary) return null;
  const entryPaise =
    typeof summary.entryFeePaise === 'number' && Number.isFinite(summary.entryFeePaise)
      ? summary.entryFeePaise
      : undefined;
  const entryFee =
    typeof summary.entryFee === 'number' && Number.isFinite(summary.entryFee) ? summary.entryFee : undefined;
  const entryType: 'free' | 'paid' = entryPaise && entryPaise > 0 ? 'paid' : entryFee && entryFee > 0 ? 'paid' : 'free';
  const normalizedBanner =
    typeof summary.bannerUrl === 'string' && summary.bannerUrl.trim().length > 0
      ? summary.bannerUrl
      : typeof raw?.coverUrl === 'string'
      ? raw.coverUrl
      : typeof raw?.banner === 'string'
      ? raw.banner
      : null;
  return {
    id: summary._id,
    title: summary.title,
    banner: typeof normalizedBanner === 'string' ? normalizedBanner : null,
    status: summary.status,
    entryType,
    entryFee: entryType === 'paid' ? entryPaise ?? entryFee ?? undefined : undefined,
    category: summary.category,
    participants: summary.registeredCount,
    maxParticipants: summary.maxParticipants || undefined,
    prizePool: summary.prizePool ?? undefined,
    startAt: summary.startAt,
    endAt: summary.endAt ?? undefined,
  };
};

export const toEventDetail = (raw: any): EventDetailView | null => {
  const detail = adaptEventDetail(raw);
  if (!detail) return null;
  const now = Date.now();
  const startTime = Date.parse(detail.startAt);
  const endTime = detail.endAt ? Date.parse(detail.endAt) : Number.NaN;
  const isLive =
    detail.status === 'ongoing' ||
    (Number.isFinite(startTime) && startTime <= now && (!Number.isFinite(endTime) || endTime >= now));
  const isCompleted =
    detail.status === 'completed' || detail.status === 'canceled' || (Number.isFinite(endTime) && endTime < now);
  const entryPaise =
    typeof detail.entryFeePaise === 'number' && Number.isFinite(detail.entryFeePaise)
      ? detail.entryFeePaise
      : undefined;
  const entryFee =
    typeof detail.entryFee === 'number' && Number.isFinite(detail.entryFee) ? detail.entryFee : undefined;
  return {
    ...detail,
    isLive,
    isUpcoming: !isLive && !isCompleted,
    isCompleted,
    entryType: entryPaise && entryPaise > 0 ? 'paid' : entryFee && entryFee > 0 ? 'paid' : 'free',
    entryFeeAmount: entryPaise ?? entryFee ?? undefined,
  };
};

export const toRegistration = (raw: any) => adaptEventRegistrationSummary(raw);

export const toUpdate = (raw: any) => adaptEventUpdate(raw);

export const toLeaderboardRow = (raw: any) => adaptEventLeaderboardEntry(raw);
