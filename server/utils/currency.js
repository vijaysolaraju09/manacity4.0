const sanitizeNumber = (value) => {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 0;
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

exports.toPaise = (value) => {
  const num = sanitizeNumber(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
};

exports.toRupees = (paise) => {
  const num = sanitizeNumber(paise);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num) / 100;
};

exports.ensurePositiveInteger = (value, fallback = 1) => {
  const num = Math.floor(sanitizeNumber(value));
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return num;
};
