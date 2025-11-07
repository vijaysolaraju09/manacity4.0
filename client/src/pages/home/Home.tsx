import type { FC } from 'react';

const Home: FC = () => (
  <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Home</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Welcome to Manacity. Explore the latest shops, services, and events happening around you.
      </p>
    </header>
    <section className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
      Feature content for the home experience will appear here.
    </section>
  </main>
);

export default Home;
