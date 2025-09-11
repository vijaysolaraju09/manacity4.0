import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import EventCard from "../../components/ui/EventCard/EventCard";
import type { EventItem } from "../../components/ui/EventCard/EventCard";
import "./Events.scss";
import { fetchEvents } from "@/store/events";
import type { RootState } from "@/store";
import EventsSkeleton from "@/components/common/EventsSkeleton";
import ErrorCard from "@/components/common/ErrorCard";
import Empty from "@/components/common/Empty";

const Events = () => {
  const d = useDispatch<any>();
  const { items, status, error } = useSelector(
    (s: RootState) => s.events,
  );

  useEffect(() => {
    if (status === "idle") d(fetchEvents());
  }, [status, d]);

  if (status === "loading") return <EventsSkeleton />;
  if (status === "failed")
    return (
        <ErrorCard
          msg={error || "Failed to load events"}
          onRetry={() => d(fetchEvents())}
        />
    );
  if (status === "succeeded" && items.length === 0)
    return (
        <Empty
          msg="No events available."
          ctaText="Refresh"
          onCta={() => d(fetchEvents())}
        />
    );

  return (
    <div className="events">
      <h2>Events & Tournaments</h2>
      <div className="event-list">
        {items.map((ev) => (
          <EventCard key={ev._id} event={ev as EventItem} />
        ))}
      </div>
    </div>
  );
};

export default Events;
