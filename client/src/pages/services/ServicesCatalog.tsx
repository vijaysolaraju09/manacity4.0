import type { FC } from 'react';
import { Link } from 'react-router-dom';

const ServicesCatalog: FC = () => (
  <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Services</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Discover services from trusted providers in the Manacity marketplace.
      </p>
    </header>
    <section className="space-y-4">
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        Service cards will be rendered here.
      </div>
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        to="/services/example"
      >
        View an example service
      </Link>
    </section>
  </main>
);

export default ServicesCatalog;
