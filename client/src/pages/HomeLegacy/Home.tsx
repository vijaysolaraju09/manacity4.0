import type { FC } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchShops } from '@/store/shops';
import { fetchServices } from '@/store/services';
import { fetchEvents } from '@/store/events.slice';

const Home: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const shopsState = useSelector((state: RootState) => state.shops);
  const servicesState = useSelector((state: RootState) => state.services);
  const eventsState = useSelector((state: RootState) => state.events.list);

  const { items: shops } = shopsState;
  const { items: services } = servicesState;
  const { items: events, loading: eventsLoading, error: eventsError } = eventsState;

  useEffect(() => {
    if (shopsState.status === 'idle') {
      dispatch(fetchShops({ sort: '-createdAt', pageSize: 10 }));
    }
  }, [dispatch, shopsState.status]);

  useEffect(() => {
    if (servicesState.status === 'idle') {
      dispatch(fetchServices(undefined));
    }
  }, [dispatch, servicesState.status]);

  useEffect(() => {
    if (!eventsLoading && !eventsError && events.length === 0) {
      dispatch(fetchEvents({ pageSize: 10 }));
    }
  }, [dispatch, eventsLoading, eventsError, events.length]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <section className="mb-6">
        <div className="relative rounded-2xl overflow-hidden border border-borderc/40 bg-surface-1 p-0">
          {/* Top Banner - replace src with your banner */}
          <img src="/assets/banner-hero.jpg" alt="Welcome to Manacity" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          <div className="absolute bottom-3 left-4 text-white">
            <h1 className="text-2xl font-bold">Manacity</h1>
            <p className="opacity-90">Shops • Services • Events — all in one</p>
          </div>
        </div>
      </section>

      {/* Shops */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Shops</h2>
          <Link to="/shops" className="text-accent-500 hover:underline">See all</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {shops.slice(0, 10).map((s) => (
            <Link key={s._id} to={`/shops/${s._id}`} className="min-w-[220px] rounded-xl border border-borderc/40 bg-surface-1 shadow-inner-card p-3">
              <div className="h-28 rounded-lg overflow-hidden mb-2 bg-surface-2">
                {s.image && <img src={s.image} alt={s.name} className="w-full h-full object-cover" />}
              </div>
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-text-muted text-sm">{s.category}</div>
              <div className={`text-sm ${s.isOpen ? 'text-emerald-500' : 'text-red-500'}`}>{s.isOpen ? 'Open' : 'Closed'}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Services</h2>
          <Link to="/services" className="text-accent-500 hover:underline">See all</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {services.slice(0, 10).map((svc) => (
            <Link key={svc._id} to={`/services/${svc._id}`} className="min-w-[220px] rounded-xl border border-borderc/40 bg-surface-1 shadow-inner-card p-3">
              <div className="h-28 rounded-lg overflow-hidden mb-2 bg-surface-2 grid place-items-center">
                <img src={svc.icon || '/assets/service-fallback.png'} alt="" className="h-14 w-14 object-contain opacity-90" />
              </div>
              <div className="font-medium truncate">{svc.title || svc.name}</div>
              <div className="text-text-muted text-sm">{svc.category}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Events */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Events</h2>
          <Link to="/events" className="text-accent-500 hover:underline">See all</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {events.slice(0, 10).map((ev) => {
            const cover = (ev as { cover?: string | null }).cover ?? ev.bannerUrl ?? (ev as { coverUrl?: string | null }).coverUrl ?? null;
            return (
              <Link key={ev._id} to={`/events/${ev._id}`} className="min-w-[240px] rounded-xl border border-borderc/40 bg-surface-1 shadow-inner-card p-3">
                <div className="h-28 rounded-lg overflow-hidden mb-2 bg-surface-2">
                  {cover && <img src={cover} alt={ev.title} className="w-full h-full object-cover" />}
                </div>
                <div className="font-medium truncate">{ev.title}</div>
                <div className="text-text-muted text-sm">{ev.type} • {ev.entryFee ? `₹${ev.entryFee}` : 'Free'}</div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default Home;
