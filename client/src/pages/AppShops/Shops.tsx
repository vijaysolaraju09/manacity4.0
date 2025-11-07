import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchShops } from '@/store/shops';
import fallbackImage from '@/assets/no-image.svg';

export default function Shops() {
  const dispatch = useAppDispatch();
  const { items: shops, status } = useAppSelector((s) => s.shops);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchShops({ pageSize: 24, sort: '-createdAt' }));
    }
  }, [dispatch, status]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return shops ?? [];
    return (shops ?? []).filter((x: any) =>
      [x.name, x.category]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(s)),
    );
  }, [q, shops]);

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Shops</h1>
        <div className="mt-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shops…"
            className="w-full rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2"
            aria-label="Search shops"
          />
        </div>
      </header>
      {filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s: any) => (
            <Link
              key={s._id}
              to={`/shops/${s._id}`}
              className="rounded-xl border border-borderc/40 bg-surface-1 p-3 shadow-inner-card transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-lg overflow-hidden bg-surface-2">
                  <img
                    src={s.image || fallbackImage}
                    onError={(e) => {
                      e.currentTarget.src = fallbackImage;
                    }}
                    alt={s.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{s.name}</div>
                  <div className="text-text-muted text-sm truncate">{s.category || 'General'}</div>
                  <div className={`text-sm ${s.isOpen ? 'text-emerald-500' : 'text-red-500'}`}>
                    {s.isOpen ? 'Open' : 'Closed'}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-borderc/60 bg-surface-1 px-4 py-10 text-center text-sm text-text-muted">
          No shops match that search yet. Try a different keyword or explore the home feed for featured stores.
        </div>
      )}
    </div>
  );
}
