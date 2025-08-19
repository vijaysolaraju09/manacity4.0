import { useEffect, useState } from "react";
import api from "../../api/client";
import { sampleEvents } from "../../data/sampleHomeData";
import Shimmer from "../../components/Shimmer";
import EventCard from "../../components/ui/EventCard/EventCard";
import type { EventItem } from "../../components/ui/EventCard/EventCard";
import "./Events.scss";

const Events = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/events")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setEvents(res.data as EventItem[]);
        } else {
          setEvents(sampleEvents);
        }
      })
      .catch(() => setEvents(sampleEvents))
      .finally(() => setLoading(false));
  }, []);

  const upcomingEvents = events.filter((ev) => {
    const date = ev.startDate || ev.date;
    return !date || new Date(date) >= new Date();
  });

  return (
    <div className="events">
      <h2>Events & Tournaments</h2>
      <div className="event-list">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "var(--color-surface)",
                  borderRadius: "12px",
                  padding: "1rem",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <Shimmer className="rounded" style={{ height: 140 }} />
                <Shimmer
                  style={{ height: 16, marginTop: 8, width: "70%" }}
                />
                <Shimmer
                  style={{ height: 14, marginTop: 4, width: "40%" }}
                />
              </div>
            ))
          : upcomingEvents.map((ev) => <EventCard key={ev._id} event={ev} />)}
      </div>
    </div>
  );
};

export default Events;
