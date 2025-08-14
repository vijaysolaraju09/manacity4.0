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
  startDate?: string;
  date?: string;
  status?: string;
  banner?: string;
  image?: string;
  location?: string;
}

const Events = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "ongoing" | "past">("upcoming");
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

  return (
    <div className="events">
      <h2>Events & Tournaments</h2>
      <div className="tabs">
        {(["upcoming", "ongoing", "past"] as const).map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="event-list">
        {(loading ? Array.from({ length: 4 }) : events.filter((ev) => {
          if (tab === "past") return ev.status === "closed" || ev.status === "past";
          return (ev.status || "upcoming") === tab;
        })).map((ev, i) => {
          const date = ev?.startDate || ev?.date || "";
          const formattedDate = date
            ? new Date(date).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "";
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
                    src={ev.banner || ev.image || fallbackImage}
                    alt={ev.title || ev.name}
                    onError={(e) => (e.currentTarget.src = fallbackImage)}
                  />
                  <h3>{ev.title || ev.name}</h3>
                  {formattedDate && <p className="date">{formattedDate}</p>}
                  {ev.location && <p className="location">{ev.location}</p>}
                  <button
                    className="register-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/events/${ev._id}`);
                    }}
                  >
                    Register
                  </button>
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
