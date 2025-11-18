import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/button';
import SkeletonList from '@/components/ui/SkeletonList';
import ErrorCard from '@/components/ui/ErrorCard';
import { http } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';
import { paths } from '@/routes/paths';
import styles from './AnnouncementDetail.module.scss';

interface AnnouncementResponse {
  announcement: Announcement;
}

interface Announcement {
  _id: string;
  title: string;
  text: string;
  image?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const AnnouncementDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnnouncement = async () => {
      if (!id) {
        setError('Announcement not found');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await http.get<AnnouncementResponse>(`/api/announcements/${id}`);
        setAnnouncement(res.data?.announcement ?? null);
      } catch (err) {
        setError(toErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    void loadAnnouncement();
  }, [id]);

  if (loading) {
    return (
      <div className={styles.container}>
        <SkeletonList count={1} lines={4} withAvatar />
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className={styles.container}>
        <ErrorCard message={error || 'Announcement not found'} onRetry={() => navigate(paths.home())} />
      </div>
    );
  }

  const handleCta = () => {
    if (!announcement.ctaLink) return;
    const link = announcement.ctaLink.startsWith('http')
      ? announcement.ctaLink
      : announcement.ctaLink.startsWith('/')
      ? announcement.ctaLink
      : `/${announcement.ctaLink}`;
    window.open(link, '_blank', 'noopener');
  };

  return (
    <div className={styles.container}>
      <article className={styles.card}>
        <div className={styles.header}>
          <div>
            <p className={styles.label}>Announcement</p>
            <h1 className={styles.title}>{announcement.title}</h1>
            {announcement.createdAt ? (
              <p className={styles.meta}>
                Published {new Date(announcement.createdAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
        {announcement.image ? (
          <div className={styles.imageWrapper}>
            <img src={announcement.image} alt="" loading="lazy" />
          </div>
        ) : null}
        <p className={styles.body}>{announcement.text}</p>
        {announcement.ctaText && announcement.ctaLink ? (
          <div className={styles.actions}>
            <Button type="button" onClick={handleCta}>
              {announcement.ctaText}
            </Button>
          </div>
        ) : null}
      </article>
    </div>
  );
};

export default AnnouncementDetail;
