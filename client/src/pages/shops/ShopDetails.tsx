import type { FC } from 'react';
import { useParams } from 'react-router-dom';

const ShopDetails: FC = () => {
  const { shopId } = useParams();

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Shop Details</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Detailed information about shop {shopId ?? '—'} will appear here.
        </p>
      </header>
      <section className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        Product listings, contact information, and reviews for the selected shop will be displayed in this area.
      </section>
    </main>
  );
};

export default ShopDetails;
