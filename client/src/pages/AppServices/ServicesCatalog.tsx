import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import fallbackImage from '@/assets/no-image.svg';

export default function ServicesCatalog() {
  const servicesState = useAppSelector((s) => s.services);
  const myRequestsState = useAppSelector((s) => s.serviceRequests.mine);
  const publicRequestsState = useAppSelector((s) => s.serviceRequests.publicList);
  const services = servicesState.items ?? [];
  const myRequests = myRequestsState.items ?? [];
  const publicRequests = publicRequestsState.items ?? [];
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'available' | 'my' | 'public'>('available');

  const ql = q.trim().toLowerCase();
  const data = useMemo(
    () => services.filter((s: any) => !ql || (s.title || s.name || '').toLowerCase().includes(ql)),
    [services, ql],
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Services</h1>
          <Link
            to="/services/request"
            className="inline-flex items-center gap-2 rounded-xl border border-accent-500 px-4 py-2 text-sm font-semibold text-accent-500 transition hover:bg-accent-500 hover:text-white"
          >
            Request a service
          </Link>
        </div>
        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search services…"
            className="w-full rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2"
            aria-label="Search services"
          />
        </div>
        <div className="overflow-x-auto flex gap-2 pb-1">
          {[
            { key: 'available', label: 'Available Services' },
            { key: 'my', label: 'My Requests' },
            { key: 'public', label: 'Public Requests' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`px-3 py-2 rounded-full border ${tab === t.key ? 'bg-surface-2 border-accent-500 text-white' : 'bg-surface-1 border-borderc/40 text-text-primary'}`}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      {(() => {
        const items = tab === 'available' ? data : tab === 'my' ? myRequests : publicRequests;
        if (items.length === 0) {
          return (
            <div className="rounded-2xl border border-dashed border-borderc/60 bg-surface-1 px-4 py-10 text-center text-sm text-text-muted">
              No services found here yet. Try switching tabs or posting a new request so our team can assist you.
            </div>
          );
        }
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s: any) => {
              const id = s._id || s.id || s.serviceId;
              return (
                <Link
                  key={id}
                  to={`/services/${id}`}
                  className="rounded-xl border border-borderc/40 bg-surface-1 p-3 shadow-inner-card transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="h-28 rounded-lg overflow-hidden mb-2 bg-surface-2 grid place-items-center">
                    <img
                      src={s.icon || fallbackImage}
                      alt={s.title || s.name}
                      onError={(e) => {
                        e.currentTarget.src = fallbackImage;
                      }}
                      className="h-14 w-14 object-contain opacity-90"
                    />
                  </div>
                  <div className="font-medium truncate">{s.title || s.name}</div>
                  <div className="text-text-muted text-sm">{s.category}</div>
                </Link>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
