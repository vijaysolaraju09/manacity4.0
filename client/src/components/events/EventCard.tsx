import React from 'react';
import { Link } from 'react-router-dom';

export default function EventCard({ event }: { event: any }) {
  const ms = new Date(event.startAt).getTime() - Date.now();
  const startsSoon = ms > 0 && ms < 24 * 60 * 60 * 1000;
  return (
    <div className="rounded-xl border border-borderc/40 bg-surface-1 p-3 shadow-inner-card">
      <div className="h-28 rounded-lg overflow-hidden mb-2 bg-surface-2">
        {(event.cover || event.coverUrl) && (
          <img src={event.cover || event.coverUrl} alt={event.title} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="font-medium truncate">{event.title}</div>
      <div className="text-text-muted text-sm">
        {event.type} • {event.entryFee ? `₹${event.entryFee}` : 'Free'}
      </div>
      {startsSoon && <span className="mt-2 inline-block text-amber-400 text-xs">Starts soon</span>}
      <div className="mt-3">
        <Link to={`/events/${event._id}`} className="btn btn-sm">
          View details
        </Link>
      </div>
    </div>
  );
}
