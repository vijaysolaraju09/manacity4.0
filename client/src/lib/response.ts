export const toItems = (res: any): any[] => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.data?.items)) return d.data.items;
  return [];
};

export const toItem = (res: any): any => {
  const d = res?.data ?? res;
  if (d && typeof d === 'object') {
    if (d.data && typeof d.data === 'object') return d.data;
    if (d.item && typeof d.item === 'object') return d.item;
  }
  return d;
};

export const toErrorMessage = (err: any): string => {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    'Request failed'
  );
};
