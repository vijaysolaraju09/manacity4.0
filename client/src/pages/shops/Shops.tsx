import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchShops } from '@/store/shops/actions';

const Shops: FC = () => {
  const dispatch = useAppDispatch();
  const { items: shops, status, error } = useAppSelector((state) => state.shops);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchShops(undefined));
    }
  }, [dispatch, status]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return shops;
    return shops.filter((x) =>
      [x.name, x.category].filter(Boolean).some((v) => v.toLowerCase().includes(s)),
    );
  }, [q, shops]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
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

      {status === 'failed' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {error || 'Failed to load shops.'}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((s) => (
          <Link
            key={s._id}
            to={`/shops/${s._id}`}
            className="rounded-xl border border-borderc/40 bg-surface-1 p-3 shadow-inner-card"
          >
            <div className="flex gap-3">
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-surface-2">
                {s.image && (
                  <img src={s.image} alt={s.name} className="h-full w-full object-cover" />
                )}
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
        {status === 'loading' && shops.length === 0 ? (
          <div className="col-span-full rounded-xl border border-borderc/40 bg-surface-1 p-6 text-center text-text-muted">
            Loading shops…
          </div>
        ) : null}
        {status === 'succeeded' && filtered.length === 0 ? (
          <div className="col-span-full rounded-xl border border-borderc/40 bg-surface-1 p-6 text-center text-text-muted">
            No shops found.
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default Shops;
