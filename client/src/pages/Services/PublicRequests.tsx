import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/button';
import SkeletonList from '@/components/ui/SkeletonList';
import showToast from '@/components/ui/Toast';
import { paths } from '@/routes/paths';
import {
  acceptPublicServiceRequest,
  fetchPublicServiceRequests,
} from '@/store/serviceRequests';
import type { AppDispatch, RootState } from '@/store';
import styles from './PublicRequests.module.scss';

const formatDate = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const formatStatus = (status: string) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : '';

const PublicRequests = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const publicState = useSelector((state: RootState) => state.serviceRequests.publicList);
  const currentUserId = useSelector(
    (state: RootState) => state.userProfile.item?.id ?? state.auth.user?.id ?? null
  );
  const isAuthenticated = Boolean(useSelector((state: RootState) => state.auth.token));
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchPublicServiceRequests(undefined));
  }, [dispatch]);

  const items = useMemo(() => {
    const raw = publicState.items ?? [];
    if (!currentUserId) return raw;
    return raw.filter(
      (entry) => entry.requesterId !== currentUserId && entry.acceptedBy !== currentUserId
    );
  }, [publicState.items, currentUserId]);

  const handleRefresh = () => {
    dispatch(fetchPublicServiceRequests({ page: publicState.page }));
  };

  const handleAccept = async (id: string) => {
    if (!isAuthenticated) {
      navigate(paths.auth.login());
      return;
    }
    setSubmitting(id);
    try {
      await dispatch(acceptPublicServiceRequest({ id })).unwrap();
      showToast('Request accepted. Contact details will be shared with you.', 'success');
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to accept request';
      showToast(message, 'error');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className={styles.page}>
      {publicState.status === 'loading' ? (
        <SkeletonList count={3} />
      ) : publicState.error ? (
        <div className={styles.error}>
          <p>{publicState.error}</p>
          <Button variant="secondary" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <p>No public requests yet.</p>
          <Button onClick={() => navigate(paths.services.request())}>
            Request a Service
          </Button>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((request) => (
            <div
              key={request._id}
              className={styles.card}
              role="button"
              tabIndex={0}
              onClick={() => navigate(paths.serviceRequests.detail(request._id))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(paths.serviceRequests.detail(request._id));
                }
              }}
            >
              <div className={styles.cardTitle}>{request.title}</div>
              {request.description ? (
                <p className={styles.description}>{request.description}</p>
              ) : null}
              <div className={styles.meta}>
                {request.location ? <span>{request.location}</span> : null}
                {request.requester ? <span>{request.requester}</span> : null}
                {request.createdAt ? <span>Posted {formatDate(request.createdAt)}</span> : null}
                <span className={styles.chip}>{formatStatus(request.status)}</span>
                {request.acceptedBy ? <span>Accepted</span> : <span>{request.offersCount} offers</span>}
              </div>
              {isAuthenticated ? (
                <Button
                  className={styles.offerButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleAccept(request._id);
                  }}
                  disabled={
                    request.status !== 'pending' || Boolean(request.acceptedBy) || submitting === request._id
                  }
                >
                  {request.acceptedBy
                    ? 'Already accepted'
                    : submitting === request._id
                    ? 'Offering help…'
                    : 'Offer Help'}
                </Button>
              ) : (
                <Button
                  className={styles.offerButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(paths.auth.login());
                  }}
                >
                  Sign in to help
                </Button>
              )}
            </div>
          ))}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={handleRefresh}>
              Refresh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicRequests;
