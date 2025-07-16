import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api/client";
import { sampleEvent } from "../../data/sampleData";
import Shimmer from "../../components/Shimmer";
import Loader from "../../components/Loader";
import "./EventDetails.scss";
import fallbackImage from "../../assets/no-image.svg";

interface Event {
  _id: string;
  name: string;
  image?: string;
  category: string;
  location: string;
  startDate?: string;
  date?: string;
  description: string;
  adminNote?: string;
}

const EventDetails = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<Array<{ userId: string; name: string; score: number }>>([]);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    api
      .get(`/events/${id}`)
      .then((res) => {
        if (res.data) {
          setEvent(res.data);
          startCountdown(res.data.startDate || res.data.date);
        } else {
          setEvent(sampleEvent);
          startCountdown(sampleEvent.startDate || sampleEvent.date);
        }
      })
      .catch(() => {
        setEvent(sampleEvent);
        startCountdown(sampleEvent.startDate || sampleEvent.date);
      })
      .finally(() => setLoading(false));

    api
      .get(`/events/${id}/leaderboard`)
      .then((res) => {
        if (Array.isArray(res.data)) setLeaderboard(res.data);
      })
      .catch(() => setLeaderboard([]));
  }, [id]);

  const startCountdown = (eventDate: string) => {
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
  };

  const handleRegister = () => {
    setRegistering(true);
    api
      .post(`/events/${id}/register`)
      .then(() => {
        setRegistered(true);
        setMessage("Registered successfully!");
      })
      .catch(() => setMessage("Registration failed"))
      .finally(() => setRegistering(false));
  };

  if (loading || !event)
    return (
      <div className="event-details">
        <Shimmer style={{ width: "100%", height: 300 }} className="rounded" />
        <div className="info">
          <Shimmer style={{ height: 32, width: "60%", margin: "1rem auto" }} />
          <Shimmer style={{ height: 20, width: "40%", marginBottom: 16 }} />
          <Shimmer style={{ height: 20, width: "40%", marginBottom: 16 }} />
          <Shimmer style={{ height: 60, width: "100%" }} />
        </div>
      </div>
    );

  return (
    <div className="event-details">
      <img
        src={event.image || "https://via.placeholder.com/600x300?text=Event"}
        alt={event.name}
        className="event-img"
        onError={(e) => (e.currentTarget.src = fallbackImage)}
      />
      <div className="info">
        <h1>{event.name}</h1>
        <p className="meta">
          {event.category} • {event.location}
        </p>
        <p className="countdown">Starts in: {countdown}</p>
        <p className="description">{event.description}</p>

        {event.adminNote && (
          <div className="admin-note">
            <strong>Admin Note:</strong> {event.adminNote}
          </div>
        )}

        <button
          className="register-btn"
          onClick={handleRegister}
          disabled={registered || registering}
        >
          {registering ? <Loader /> : registered ? 'Registered' : 'Register Now'}
        </button>

        {message && <p className="message">{message}</p>}

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
