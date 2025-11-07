import type { FC } from 'react';
import { useParams } from 'react-router-dom';

const EventDetails: FC = () => {
  const { eventId } = useParams();

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Event Details</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Explore the schedule, speakers, and registration options for event {eventId ?? '—'}.
        </p>
      </header>
      <section className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        In-depth event information will be presented here.
      </section>
    </main>
  );
};

export default EventDetails;
