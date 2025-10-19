import { formatINR } from '@/utils/currency';

export const computeSavings = (mrpPaise?: number, salePricePaise?: number) => {
  if (!Number.isFinite(mrpPaise ?? NaN) || !Number.isFinite(salePricePaise ?? NaN)) {
    return { savingsPaise: 0, savingsPercent: 0 };
  }

  const mrp = Math.max(0, Math.round(mrpPaise ?? 0));
  const sale = Math.max(0, Math.round(salePricePaise ?? 0));

  if (mrp <= 0 || sale <= 0 || sale >= mrp) {
    return { savingsPaise: 0, savingsPercent: 0 };
  }

  const savingsPaise = mrp - sale;
  const savingsPercent = Math.round((savingsPaise / mrp) * 100);

  return { savingsPaise, savingsPercent };
};

export const formatSavings = (savingsPaise: number) => {
  if (!Number.isFinite(savingsPaise) || savingsPaise <= 0) {
    return null;
  }

  return formatINR(savingsPaise);
};

export const formatPercent = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return `${value}%`;
};
