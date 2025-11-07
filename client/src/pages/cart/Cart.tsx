import type { FC } from 'react';

const Cart: FC = () => (
  <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col gap-6 px-4 py-10">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Cart</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Review the products and services you intend to purchase before checking out.
      </p>
    </header>
    <section className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
      Your cart items will appear here.
    </section>
  </main>
);

export default Cart;
