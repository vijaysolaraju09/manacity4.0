import type { FC } from 'react';

const ReceivedOrders: FC = () => (
  <main className="mx-auto flex min-h-[60vh] w-full max-w-5xl flex-col gap-6 px-4 py-10">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Received Orders</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Monitor incoming orders for your business and manage fulfillment workflows.
      </p>
    </header>
    <section className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
      Business order summaries will appear in this dashboard.
    </section>
  </main>
);

export default ReceivedOrders;
