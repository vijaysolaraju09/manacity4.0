import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import Section from '@/components/layout/Section';
import HorizontalScroller from '@/components/layout/HorizontalScroller';
import HeroBanner from '@/components/home/HeroBanner';
import { fetchShops } from '@/store/shops';
import { fetchServices } from '@/store/services';
import { fetchEvents } from '@/store/events.slice';
import fallbackImage from '@/assets/no-image.svg';

const eventsQuery = { pageSize: 8 } as const;

export default function Home() {
  const dispatch = useAppDispatch();
  const shopsState = useAppSelector((s) => s.shops);
  const servicesState = useAppSelector((s) => s.services);
  const eventsState = useAppSelector((s) => s.events.list);

  useEffect(() => {
    if (shopsState.status === 'idle') {
      void dispatch(fetchShops({ pageSize: 10, sort: '-createdAt' }));
    }
    if (servicesState.status === 'idle') {
      void dispatch(fetchServices(undefined));
    }
    if (!eventsState.loading && (eventsState.items?.length ?? 0) === 0) {
      void dispatch(fetchEvents(eventsQuery));
    }
  }, [dispatch, shopsState.status, servicesState.status, eventsState.loading, eventsState.items?.length]);

  const shops = shopsState.items ?? [];
  const services = servicesState.items ?? [];
  const events = eventsState.items ?? [];

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <HeroBanner shopsCount={shops.length} servicesCount={services.length} eventsCount={events.length} />
      <Section title="Shops" seeAllTo="/shops">
        {shops.length > 0 ? (
          <HorizontalScroller
            data={shops}
            renderItem={(s: any) => (
              <Link
                to={`/shops/${s._id ?? s.id}`}
                className="min-w-[220px] rounded-xl border border-borderc/40 bg-surface-1 shadow-inner-card p-3 block"
              >
                <div className="h-28 rounded-lg overflow-hidden mb-2 bg-surface-2">
                  <img
                    src={s.image || fallbackImage}
                    alt={s.name}
                    onError={(e) => {
                      e.currentTarget.src = fallbackImage;
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="font-medium truncate">{s.name}</div>
                <div className="text-text-muted text-sm">{s.category || 'General'}</div>
                <div className={`text-sm ${s.isOpen ? 'text-emerald-500' : 'text-red-500'}`}>
                  {s.isOpen ? 'Open' : 'Closed'}
                </div>
              </Link>
            )}
          />
        ) : (
          <EmptyState message="No shops available right now. New businesses are onboarding soon!" />
        )}
      </Section>

      <Section title="Services" seeAllTo="/services">
        {services.length > 0 ? (
          <HorizontalScroller
            data={services}
            renderItem={(svc: any) => (
              <Link
                to={`/services/${svc._id ?? svc.id}`}
                className="min-w-[220px] rounded-xl border border-borderc/40 bg-surface-1 shadow-inner-card p-3 block"
              >
                <div className="h-28 rounded-lg overflow-hidden mb-2 bg-surface-2 grid place-items-center">
                  <img
                    src={svc.icon || fallbackImage}
                    alt={svc.title || svc.name}
                    onError={(e) => {
                      e.currentTarget.src = fallbackImage;
                    }}
                    className="h-14 w-14 object-contain opacity-90"
                  />
                </div>
                <div className="font-medium truncate">{svc.title || svc.name}</div>
                <div className="text-text-muted text-sm">{svc.category || 'Service'}</div>
              </Link>
            )}
          />
        ) : (
          <EmptyState message="Service partners are updating their listings. Check back shortly." />
        )}
      </Section>

      <Section title="Events" seeAllTo="/events">
        {events.length > 0 ? (
          <HorizontalScroller
            data={events}
            renderItem={(e: any) => (
              <Link
                to={`/events/${e._id ?? e.id}`}
                className="min-w-[240px] rounded-xl border border-borderc/40 bg-surface-1 shadow-inner-card p-3 block"
              >
                <div className="h-28 rounded-lg overflow-hidden mb-2 bg-surface-2">
                  <img
                    src={e.coverUrl || e.cover || fallbackImage}
                    alt={e.title}
                    onError={(event) => {
                      event.currentTarget.src = fallbackImage;
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="font-medium truncate">{e.title}</div>
                <div className="text-text-muted text-sm">
                  {e.type || 'Event'} • {e.entryFee ? `₹${e.entryFee}` : 'Free'}
                </div>
              </Link>
            )}
          />
        ) : (
          <EmptyState message="No events are live right now. Follow the community feed for upcoming announcements." />
        )}
      </Section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-borderc/60 bg-surface-1 px-4 py-10 text-center text-sm text-text-muted">
      {message}
    </div>
  );
}
