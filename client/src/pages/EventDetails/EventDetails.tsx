import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { api } from "@/config/api";
import { fetchEventById } from "@/store/events";
import type { RootState } from "@/store";
import EventsSkeleton from "@/components/common/EventsSkeleton";
import ErrorCard from "@/components/common/ErrorCard";
import Empty from "@/components/common/Empty";
import Loader from "../../components/Loader";
import "./EventDetails.scss";
import fallbackImage from "../../assets/no-image.svg";

interface EventData {
  _id: string;
  name: string;
  image?: string;
  category: string;
  location: string;
  startDate?: string;
  date?: string;
  description: string;
  adminNote?: string;
  registeredUsers?: { user: string }[];
}

const getCalendarUrl = (event: EventData) => {
  const date = event.startDate || event.date;
  if (!date) return "#";
  const start = new Date(date)
    .toISOString()
    .replace(/-|:|\.\d\d\d/g, "");
  const end = new Date(new Date(date).getTime() + 60 * 60 * 1000)
    .toISOString()
    .replace(/-|:|\.\d\d\d/g, "");
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    event.name
  )}&dates=${start}/${end}&details=${encodeURIComponent(
    event.description
  )}&location=${encodeURIComponent(event.location)}`;
};

const EventDetails = () => {
  const { id } = useParams();
  const d = useDispatch<any>();
  const { item: event, status, error } = useSelector(
    (s: RootState) => s.events,
  ) as {
    item: EventData | null;
    status: string;
    error: string | null;
  };
  const [countdown, setCountdown] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<Array<{ userId: string; name: string; score: number }>>([]);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (id) d(fetchEventById(id));
  }, [id, d]);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/events/${id}/leaderboard`)
      .then((res) => {
        if (Array.isArray(res.data)) setLeaderboard(res.data);
      })
      .catch(() => setLeaderboard([]));
  }, [id]);

  useEffect(() => {
    if (!event) return;
    const eventDate = event.startDate || event.date;
    if (!eventDate) return;
    const interval = setInterval(() => {
      const distance = new Date(eventDate).getTime() - Date.now();
      if (distance < 0) {
        clearInterval(interval);
        setCountdown("Started");
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hrs = Math.floor((distance / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((distance / (1000 * 60)) % 60);
        setCountdown(`${days}d ${hrs}h ${mins}m`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [event]);

  const handleRegister = () => {
    setRegistering(true);
    api
      .post(`/events/${id}/register`)
      .then(() => {
        setRegistered(true);
        setMessage("You're registered!");
        if (id) d(fetchEventById(id));
      })
      .catch(() => setMessage("Registration failed"))
      .finally(() => setRegistering(false));
  };
  if (status === "loading") return <EventsSkeleton />;
  if (status === "failed")
    return (
      <ErrorCard
        msg={error || "Failed to load event"}
        onRetry={() => id && d(fetchEventById(id))}
      />
    );
  if (status === "succeeded" && !event) return <Empty msg="No event found." />;
  if (!event) return null;
  const ev = event;

  return (
    <div className="event-details">
      <img
        src={ev.image || fallbackImage}
        alt={ev.name}
        className="event-img"
        onError={(e) => (e.currentTarget.src = fallbackImage)}
      />
      <div className="info">
        <h1>{ev.name}</h1>
        <p className="meta">
          {ev.category} • {ev.location}
        </p>
        <p className="countdown">Starts in: {countdown}</p>
        <p className="description">{ev.description}</p>

        {ev.adminNote && (
          <div className="admin-note">
            <strong>Admin Note:</strong> {ev.adminNote}
          </div>
        )}
        <div className="participants">
          <h3>Participants</h3>
          <p>{ev.registeredUsers?.length ?? 0} registered</p>
        </div>
        <button
          className="register-btn"
          onClick={handleRegister}
          disabled={registered || registering}
        >
          {registering ? <Loader /> : registered ? 'Registered' : 'Register Now'}
        </button>
        {message && <p className="message">{message}</p>}
        {registered && (
          <a
            href={getCalendarUrl(ev)}
            target="_blank"
            rel="noopener noreferrer"
            className="add-calendar-btn"
          >
            Add to Calendar
          </a>
        )}

        {leaderboard.length > 0 && (
          <div className="leaderboard">
            <h3>Leaderboard</h3>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={entry.userId} className={i < 3 ? "winner" : ""}>
                    <td>{i + 1}</td>
                    <td>{entry.name}</td>
                    <td>{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
