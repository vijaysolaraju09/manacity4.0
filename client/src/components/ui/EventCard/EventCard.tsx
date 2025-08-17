import { useNavigate } from "react-router-dom";
import fallbackImage from "../../../assets/no-image.svg";
import styles from "./EventCard.module.scss";

export interface EventItem {
  _id: string;
  title?: string;
  name?: string;
  startDate?: string;
  date?: string;
  banner?: string;
  image?: string;
  location?: string;
}

interface Props {
  event: EventItem;
}

const EventCard = ({ event }: Props) => {
  const navigate = useNavigate();
  const date = event.startDate || event.date;

  if (date && new Date(date) < new Date()) return null;

  const formattedDate = date
    ? new Date(date).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  return (
    <div
      className={styles.card}
      onClick={() => navigate(`/events/${event._id}`)}
    >
      <img
        src={event.banner || event.image || fallbackImage}
        alt={event.title || event.name}
        onError={(e) => (e.currentTarget.src = fallbackImage)}
      />
      <h3>{event.title || event.name}</h3>
      {formattedDate && <p className={styles.date}>{formattedDate}</p>}
      {event.location && (
        <p className={styles.location}>{event.location}</p>
      )}
      <button
        className={styles.registerBtn}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/events/${event._id}`);
        }}
      >
        Register
      </button>
    </div>
  );
};

export default EventCard;
