const SUPPORTED_DATE_OPTION_KEYS: Array<keyof Intl.DateTimeFormatOptions> = [
  'localeMatcher',
  'weekday',
  'era',
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'second',
  'timeZoneName',
  'formatMatcher',
  'hour12',
  'timeZone',
  'hourCycle',
  'dateStyle',
  'timeStyle',
  'calendar',
  'numberingSystem',
  'dayPeriod',
  'fractionalSecondDigits',
];

const sanitizeDateOptions = (
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions | undefined => {
  if (!options) return undefined;
  const sanitized: Intl.DateTimeFormatOptions = {};
  for (const key of SUPPORTED_DATE_OPTION_KEYS) {
    if (options[key] !== undefined) {
      sanitized[key] = options[key];
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

const stripUnsupportedStyles = (
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions | undefined => {
  const fallback: Intl.DateTimeFormatOptions = { ...options };
  let changed = false;

  if ('dateStyle' in fallback) {
    delete fallback.dateStyle;
    changed = true;
    if (fallback.month === undefined) {
      fallback.month = 'short';
    }
    if (fallback.day === undefined) {
      fallback.day = 'numeric';
    }
    if (fallback.year === undefined) {
      fallback.year = 'numeric';
    }
  }

  if ('timeStyle' in fallback) {
    delete fallback.timeStyle;
    changed = true;
    if (fallback.hour === undefined) {
      fallback.hour = '2-digit';
    }
    if (fallback.minute === undefined) {
      fallback.minute = '2-digit';
    }
  }

  return changed ? fallback : undefined;
};

const toLocaleStringSafe = (
  date: Date,
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
) => {
  const sanitized = sanitizeDateOptions(options);

  if (!sanitized) {
    return date.toLocaleString(locales);
  }

  try {
    return date.toLocaleString(locales, sanitized);
  } catch (error) {
    const fallback = stripUnsupportedStyles(sanitized);
    if (fallback) {
      const cleanedFallback = sanitizeDateOptions(fallback);
      if (cleanedFallback) {
        try {
          return date.toLocaleString(locales, cleanedFallback);
        } catch (err) {
          // Swallow and fall through to the plain formatter below
        }
      }
    }

    try {
      return date.toLocaleString(locales);
    } catch (err) {
      return date.toString();
    }
  }
};

const toLocaleDateStringSafe = (
  date: Date,
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
) => {
  const sanitized = sanitizeDateOptions(options);
  if (!sanitized) {
    return date.toLocaleDateString(locales);
  }

  try {
    return date.toLocaleDateString(locales, sanitized);
  } catch (error) {
    const fallback = stripUnsupportedStyles(sanitized);
    if (fallback) {
      const cleanedFallback = sanitizeDateOptions(fallback);
      if (cleanedFallback) {
        try {
          return date.toLocaleDateString(locales, cleanedFallback);
        } catch (err) {
          // Swallow and fall through to the plain formatter below
        }
      }
    }

    try {
      return date.toLocaleDateString(locales);
    } catch (err) {
      return date.toDateString();
    }
  }
};

export const formatSchedule = (start: string | Date, end: string | Date) => {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const datePart = toLocaleDateStringSafe(s, undefined, {
    month: 'short',
    day: 'numeric',
  });
  const startTime = toLocaleStringSafe(s, undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = toLocaleStringSafe(e, undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return sameDay ? `${datePart} ${startTime} - ${endTime}` : `${datePart} ${startTime}`;
};

export const getCountdown = (target: string | Date) => {
  const t = new Date(target).getTime();
  const diff = Math.max(0, t - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { diff, days, hours, minutes, seconds };
};

export const formatDateTime = (
  value?: string | Date | null,
  options?: Intl.DateTimeFormatOptions,
) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return toLocaleStringSafe(date, 'en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
    ...options,
  });
};

export const formatDate = (value?: string | Date | null, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return toLocaleDateStringSafe(date, 'en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
};

export const formatLocaleDateTime = (
  value?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions,
  locales?: Intl.LocalesArgument,
) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return toLocaleStringSafe(date, locales, options);
};

export const formatTimeAgo = (value?: string | number | Date | null): string => {
  if (!value) return '';
  const timestamp = value instanceof Date ? value.getTime() : Number(new Date(value).getTime());
  if (!Number.isFinite(timestamp)) return '';
  const now = Date.now();
  const diffMs = Math.max(0, now - timestamp);
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) {
    return `${diffSeconds || 1}s ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks}w ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths || 1}mo ago`;
  }
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears || 1}y ago`;
};
