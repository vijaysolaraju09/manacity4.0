import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AiFillCheckCircle, AiFillStar } from 'react-icons/ai';
import api from '../../api/client';
import { sampleVerifiedUser } from '../../data/sampleData';
import Shimmer from '../../components/Shimmer';
import fallbackImage from '../../assets/no-image.svg';
import styles from './Details.module.scss';

interface Stats {
  jobsCompleted: number;
  yearsExperience: number;
}

interface Review {
  _id: string;
  reviewer: string;
  comment: string;
  rating: number;
}

interface VerifiedUser {
  _id: string;
  name: string;
  profession: string;
  bio: string;
  location: string;
  contact?: string;
  avatar?: string;
  rating?: number;
  stats?: Stats;
  reviews?: Review[];
}

const VerifiedDetails = () => {
  const { id } = useParams();
  const [user, setUser] = useState<VerifiedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/verified/${id}`)
      .then((res) => {
        if (res.data) {
          setUser(res.data);
        } else {
          setUser(sampleVerifiedUser as VerifiedUser);
        }
        setLoading(false);
      })
      .catch(() => {
        setUser(sampleVerifiedUser as VerifiedUser);
        setLoading(false);
      });
  }, [id]);

  if (loading || !user)
    return (
      <div className={styles.details}>
        <div className={styles.header}>
          <Shimmer className="rounded" style={{ width: 120, height: 120 }} />
          <div className={styles.info}>
            <Shimmer style={{ height: 20, width: '60%', marginBottom: 8 }} />
            <Shimmer style={{ height: 16, width: '40%' }} />
          </div>
        </div>
        <div className={styles.bio} style={{ marginTop: '2rem' }}>
          <Shimmer style={{ height: 16, width: '80%', marginBottom: 6 }} />
          <Shimmer style={{ height: 16, width: '90%' }} />
        </div>
      </div>
    );

  return (
    <div className={styles.details}>
      <div className={styles.header}>
        <img
          src={
            user.avatar ||
            `https://ui-avatars.com/api/?name=${user.name}&background=random`
          }
          alt={user.name}
          onError={(e) => (e.currentTarget.src = fallbackImage)}
        />
        <div className={styles.info}>
          <h2>
            {user.name} <AiFillCheckCircle className={styles.badge} />
          </h2>
          <p>{user.profession}</p>
          <p>{user.location}</p>
          <div className={styles.rating}>
            <AiFillStar />
            <span>{user.rating?.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className={styles.bio}>
        <h4>About</h4>
        <p>{user.bio}</p>
      </div>

      {user.stats && (
        <div className={styles.stats}>
          <h4>Stats</h4>
          <ul>
            <li>
              <strong>{user.stats.jobsCompleted}</strong>
              <span>Jobs</span>
            </li>
            <li>
              <strong>{user.stats.yearsExperience}</strong>
              <span>Years</span>
            </li>
          </ul>
        </div>
      )}

      {user.reviews && user.reviews.length > 0 && (
        <div className={styles.reviews}>
          <h4>Reviews</h4>
          {user.reviews.map((review) => (
            <div key={review._id} className={styles.review}>
              <div className={styles.reviewHeader}>
                <span>{review.reviewer}</span>
                <div className={styles.reviewRating}>
                  <AiFillStar />
                  <span>{review.rating}</span>
                </div>
              </div>
              <p>{review.comment}</p>
            </div>
          ))}
        </div>
      )}

      {user.contact && (
        <div className={styles.contactButtons}>
          <a
            href={`https://wa.me/${user.contact}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
          <a href={`tel:${user.contact}`}>Call</a>
        </div>
      )}
    </div>
  );
};

export default VerifiedDetails;
