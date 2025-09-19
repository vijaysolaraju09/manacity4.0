export const toItems = (res: any): any[] => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.notifications)) return d.notifications;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.data?.items)) return d.data.items;
  if (Array.isArray(d.data?.notifications)) return d.data.notifications;
  const firstArray = Object.values(d).find((v) => Array.isArray(v));
  if (Array.isArray(firstArray)) return firstArray;
  if (d.data && typeof d.data === 'object') {
    const nestedArray = Object.values(d.data).find((v) => Array.isArray(v));
    if (Array.isArray(nestedArray)) return nestedArray;
  }
  return [];
};

export const toItem = (res: any): any => {
  const d = res?.data ?? res;
  if (d && typeof d === 'object') {
    if (d.data && typeof d.data === 'object') {
      const dataObj = d.data as Record<string, any>;
      if (
        typeof dataObj.token === 'string' &&
        dataObj.token &&
        dataObj.user &&
        typeof dataObj.user === 'object'
      ) {
        return dataObj;
      }
      if (d.data.shop && typeof d.data.shop === 'object') return d.data.shop;
      if (d.data.verified && typeof d.data.verified === 'object')
        return d.data.verified;
      const nested = Object.values(d.data).find((v) => typeof v === 'object');
      if (nested) return nested;
      return d.data;
    }
    if (d.shop && typeof d.shop === 'object') return d.shop;
    if (d.item && typeof d.item === 'object') return d.item;
    if (d.verified && typeof d.verified === 'object') return d.verified;
    const first = Object.values(d).find((v) => typeof v === 'object');
    if (first) return first;
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
