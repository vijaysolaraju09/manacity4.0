import { useNavigate } from "react-router-dom";
import fallbackImage from "../../../assets/no-image.svg";
import styles from "./EventCard.module.scss";
import { formatSchedule } from "@/utils/date";

export interface EventItem {
  _id: string;
  title: string;
  cover?: string;
  startsAt: string;
  endsAt: string;
  price?: number;
  registered: string[];
  status: string;
}

interface Props {
  event: EventItem;
}

const EventCard = ({ event }: Props) => {
  const navigate = useNavigate();
  const schedule = formatSchedule(event.startsAt, event.endsAt);

  return (
    <div
      className={styles.card}
      onClick={() => navigate(`/events/${event._id}`)}
    >
      <img
        src={event.cover || fallbackImage}
        alt={event.title}
        onError={(e) => (e.currentTarget.src = fallbackImage)}
      />
      <h3>{event.title}</h3>
      <p className={styles.date}>{schedule}</p>
      <p className={styles.meta}>
        Registered: {event.registered.length} | {event.price ? `₹${event.price}` : "Free"}
      </p>
    </div>
  );
};

export default EventCard;
