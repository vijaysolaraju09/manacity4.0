import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { sampleEvents } from "../../data/sampleHomeData";
import Shimmer from "../../components/Shimmer";
import "./Events.scss";
import fallbackImage from "../../assets/no-image.svg";

interface EventItem {
  _id: string;
  title?: string;
  name?: string;
  category?: string;
  startDate?: string;
  date?: string;
  status?: string;
  banner?: string;
  image?: string;
}

const Events = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/events")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setEvents(res.data);
        } else {
          setEvents(sampleEvents);
        }
      })
      .catch(() => setEvents(sampleEvents))
      .finally(() => setLoading(false));
  }, []);

  const getCountdown = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    if (diff <= 0) return "Started";
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${d}d ${h}h`;
  };

  return (
    <div className="events">
      <h2>Events & Tournaments</h2>
      <div className="event-list">
        {(loading ? Array.from({ length: 4 }) : events).map((ev, i) => {
          const date = ev?.startDate || ev?.date || "";
          return (
            <div
              key={ev?._id || i}
              className="event-card"
              onClick={() => !loading && navigate(`/events/${ev._id}`)}
            >
              {loading ? (
                <>
                  <Shimmer className="rounded" style={{ height: 140 }} />
                  <Shimmer style={{ height: 16, marginTop: 8, width: "70%" }} />
                  <Shimmer style={{ height: 14, marginTop: 4, width: "40%" }} />
                </>
              ) : (
                <>
                  <img
                    src={ev.banner || ev.image || "https://via.placeholder.com/300x200?text=Event"}
                    alt={ev.title || ev.name}
                    onError={(e) => (e.currentTarget.src = fallbackImage)}
                  />
                  <h3>{ev.title || ev.name}</h3>
                  {ev.category && <p className="cat">{ev.category}</p>}
                  {date && <p className="time">{getCountdown(date)}</p>}
                  {ev.status && <span className={`status ${ev.status}`}>{ev.status}</span>}
                </>
              )}
              
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Events;
