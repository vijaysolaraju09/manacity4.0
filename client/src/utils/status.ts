export const mergePreservingStatus = <T extends Record<string, any>>(options: {
  existing: T;
  incoming: Partial<T>;
  keys?: (keyof T)[];
}): T => {
  const { existing, incoming, keys = ['status' as keyof T] } = options;
  const merged: Record<string, any> = { ...existing, ...incoming };

  keys.forEach((key) => {
    if (incoming[key] === undefined && existing[key] !== undefined) {
      merged[key as string] = existing[key];
    }
  });

  return merged as T;
};
