import type { FC, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type Provider = {
  id: string;
  name: string;
  rating?: number;
  specialties?: string[];
};

type Service = {
  id: string;
  name: string;
  description: string;
  category: string;
  images?: string[];
  providers: Provider[];
};

const services: Service[] = [
  {
    id: 'home-cleaning',
    name: 'Home Cleaning',
    description:
      'Full home cleaning including dusting, vacuuming, and sanitizing high-touch surfaces. Ideal for both residential and small office spaces.',
    category: 'Home Care',
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    ],
    providers: [
      {
        id: 'sparkle-team',
        name: 'Sparkle Team',
        rating: 4.8,
        specialties: ['Eco-friendly products', 'Flexible scheduling'],
      },
      {
        id: 'fresh-start',
        name: 'Fresh Start Cleaners',
        rating: 4.5,
        specialties: ['Move-in/move-out', 'Deep cleaning'],
      },
    ],
  },
  {
    id: 'garden-care',
    name: 'Garden Care',
    description:
      'Keep your outdoor spaces thriving with seasonal maintenance, pruning, and landscaping support tailored to your property.',
    category: 'Outdoor',
    providers: [
      {
        id: 'green-thumb',
        name: 'Green Thumb Collective',
        rating: 4.7,
        specialties: ['Organic fertilizers', 'Landscape design'],
      },
    ],
  },
];

const ServiceDetails: FC = () => {
  const { serviceId } = useParams();
  const nav = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState<string>('assign-later');

  const svc = useMemo(() => services.find((item) => item.id === serviceId), [serviceId]);
  const providers = svc?.providers ?? [];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Placeholder submission handler. Integrate with createServiceRequest thunk when wiring to backend.
    alert(`Service request submitted for ${svc?.name ?? 'service'} with provider: ${selectedProvider}`);
  };

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <button onClick={() => nav(-1)} className="mb-3 text-accent-500">
        &larr; Back
      </button>

      <header>
        <p className="text-sm uppercase tracking-wide text-text-muted">{svc?.category ?? 'Service'}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{svc?.name ?? 'Service Details'}</h1>
        <p className="mt-2 text-base text-muted-foreground">{svc?.description}</p>
      </header>

      {svc?.images?.length ? (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {svc.images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="rounded-xl border border-borderc/30 object-cover w-full h-40"
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-borderc/40 bg-surface-2 h-40 grid place-items-center text-text-muted mb-4">
          No images available
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-borderc/50 bg-surface-1 p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Available Providers</h2>
          {providers.length ? (
            <ul className="mt-3 space-y-3">
              {providers.map((provider) => (
                <li key={provider.id} className="rounded-xl border border-borderc/40 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-medium text-text-primary">{provider.name}</p>
                      {provider.rating ? (
                        <p className="text-sm text-text-muted">Rating: {provider.rating.toFixed(1)} / 5</p>
                      ) : null}
                      {provider.specialties?.length ? (
                        <p className="text-sm text-text-secondary">
                          Specialties: {provider.specialties.join(', ')}
                        </p>
                      ) : null}
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="provider"
                        value={provider.id}
                        checked={selectedProvider === provider.id}
                        onChange={(event) => setSelectedProvider(event.target.value)}
                      />
                      Select
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-text-muted">
              No providers have been assigned to this service yet. Check back soon.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="provider"
              value="assign-later"
              checked={selectedProvider === 'assign-later'}
              onChange={(event) => setSelectedProvider(event.target.value)}
            />
            Assign later
          </label>

          <button
            type="submit"
            className="w-full rounded-full bg-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
          >
            Submit Request
          </button>
        </form>
      </section>
    </main>
  );
};

export default ServiceDetails;
