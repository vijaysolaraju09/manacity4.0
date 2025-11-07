import type { FC } from 'react';
import { Link } from 'react-router-dom';

const Shops: FC = () => (
  <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Shops</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Browse featured shops and discover the latest local businesses on Manacity.
      </p>
    </header>
    <section className="space-y-4">
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        Shop listings will be rendered in this space.
      </div>
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        to="/shops/example"
      >
        View an example shop
      </Link>
    </section>
  </main>
);

export default Shops;
