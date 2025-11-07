import type { FC } from 'react';
import { Link } from 'react-router-dom';

const EventsHub: FC = () => (
  <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Events</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Stay updated with upcoming events, workshops, and meetups happening in Manacity.
      </p>
    </header>
    <section className="space-y-4">
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        Event previews will be shown here.
      </div>
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        to="/events/example"
      >
        View an example event
      </Link>
    </section>
  </main>
);

export default EventsHub;
