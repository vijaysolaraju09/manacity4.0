import type { FC } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

type CatalogItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  href: string;
};

const ServicesCatalog: FC = () => {
  const [activeTab, setActiveTab] = useState<'available' | 'mine' | 'public'>('available');
  const [searchTerm, setSearchTerm] = useState('');

  const services: CatalogItem[] = [
    {
      id: 'home-cleaning',
      name: 'Home Cleaning',
      description: 'Full home cleaning by vetted professionals with eco-friendly products.',
      category: 'Home Care',
      provider: 'Sparkle & Shine Co.',
      href: '/services/home-cleaning',
    },
    {
      id: 'garden-care',
      name: 'Garden Care',
      description: 'Seasonal lawn maintenance and landscaping services.',
      category: 'Outdoor',
      provider: 'Green Thumb Collective',
      href: '/services/garden-care',
    },
  ];

  const myRequests: CatalogItem[] = [
    {
      id: 'it-support-request',
      name: 'IT Support Request',
      description: 'Assistance with setting up workstations for new team members.',
      category: 'Technology',
      provider: 'Pending Provider',
      href: '/services/it-support-request',
    },
  ];

  const publicRequests: CatalogItem[] = [
    {
      id: 'community-workshop',
      name: 'Community Workshop Facilitator',
      description: 'Looking for facilitators to host monthly community workshops.',
      category: 'Community',
      provider: 'City Programs',
      href: '/services/community-workshop',
    },
  ];

  const source =
    activeTab === 'available'
      ? services
      : activeTab === 'mine'
        ? myRequests
        : publicRequests;

  const filtered = source.filter((item) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return [item.name, item.description, item.category, item.provider]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Services</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Discover services from trusted providers in the Manacity marketplace.
        </p>
      </header>

      <div>
        <label className="flex w-full items-center gap-3 rounded-full border border-borderc/60 bg-surface-1 px-4 py-2 text-sm shadow-sm">
          <span className="text-text-muted">Search</span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search services or requests"
            className="flex-1 bg-transparent outline-none"
          />
        </label>

        <div className="mt-3 overflow-x-auto flex gap-2 pb-1">
          {[
            { key: 'available', label: 'Available Services' },
            { key: 'mine', label: 'My Requests' },
            { key: 'public', label: 'Public Requests' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-3 py-2 rounded-full border ${
                activeTab === t.key
                  ? 'bg-surface-2 border-accent-500 text-white'
                  : 'bg-surface-1 border-borderc/40 text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <section>
        {filtered.length ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {filtered.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="min-w-[260px] flex-1 rounded-2xl border border-borderc/50 bg-surface-1 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="text-xs uppercase tracking-wide text-text-muted">{item.category}</div>
                <h3 className="mt-2 text-lg font-semibold text-text-primary">{item.name}</h3>
                <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
                <div className="mt-4 text-sm font-medium text-text-muted">{item.provider}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-borderc/50 bg-surface-1 p-8 text-center text-sm text-text-muted">
            No services found. Try adjusting your search.
          </div>
        )}
      </section>
    </main>
  );
};

export default ServicesCatalog;
