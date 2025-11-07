import type { FC } from 'react';
import { useParams } from 'react-router-dom';

const ServiceDetails: FC = () => {
  const { serviceId } = useParams();

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Service Details</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Learn more about service {serviceId ?? '—'}, its features, and availability.
        </p>
      </header>
      <section className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        Detailed service information and booking options will be displayed here.
      </section>
    </main>
  );
};

export default ServiceDetails;
