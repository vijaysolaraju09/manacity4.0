import type { FC } from 'react';

const MyOrders: FC = () => (
  <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Track the status of your recent purchases and service bookings.
      </p>
    </header>
    <section className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
      A history of your orders will be displayed here.
    </section>
  </main>
);

export default MyOrders;
