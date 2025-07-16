import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AiFillCheckCircle, AiFillStar } from 'react-icons/ai';
import api from '../../api/client';
import { sampleVerifiedUser } from '../../data/sampleData';
import Shimmer from '../../components/Shimmer';
import './VerifiedUserDetails.scss';
import fallbackImage from '../../assets/no-image.svg';

interface VerifiedUser {
  _id: string;
  name: string;
  profession: string;
  bio: string;
  location: string;
  contact?: string;
  avatar?: string;
  rating?: number;
}

const VerifiedUserDetails = () => {
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
          setUser(sampleVerifiedUser);
        }
        setLoading(false);
      })
      .catch(() => {
        setUser(sampleVerifiedUser);
        setLoading(false);
      });
  }, [id]);

  if (loading || !user)
    return (
      <div className="verified-user-details">
        <div className="header">
          <Shimmer className="rounded" style={{ width: 120, height: 120 }} />
          <div className="info">
            <Shimmer style={{ height: 20, width: "60%", marginBottom: 8 }} />
            <Shimmer style={{ height: 16, width: "40%" }} />
          </div>
        </div>
        <div className="bio" style={{ marginTop: '2rem' }}>
          <Shimmer style={{ height: 16, width: "80%", marginBottom: 6 }} />
          <Shimmer style={{ height: 16, width: "90%" }} />
        </div>
      </div>
    );

  return (
    <div className="verified-user-details">
      <div className="header">
        <img
          src={
            user.avatar ||
            `https://ui-avatars.com/api/?name=${user.name}&background=random`
          }
          alt={user.name}
          onError={(e) => (e.currentTarget.src = fallbackImage)}
        />
        <div className="info">
          <h2>
            {user.name} <AiFillCheckCircle className="badge" />
          </h2>
          <p>{user.profession}</p>
          <p>{user.location}</p>
          {user.rating && (
            <div className="rating">
              {Array.from({ length: 5 }).map((_, i) => (
                <AiFillStar
                  key={i}
                  color={i < user.rating! ? '#fbbf24' : '#ddd'}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bio">
        <h4>About</h4>
        <p>{user.bio}</p>
      </div>

      {user.contact && (
        <a
          href={`https://wa.me/${user.contact}`}
          className="contact-button"
          target="_blank"
          rel="noopener noreferrer"
        >
          Contact on WhatsApp
        </a>
      )}
    </div>
  );
};

export default VerifiedUserDetails;
