import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/button';
import SkeletonList from '@/components/ui/SkeletonList';
import showToast from '@/components/ui/Toast';
import { paths } from '@/routes/paths';
import { fetchAssignedServiceRequests, fetchPublicServiceRequests, submitServiceOffer } from '@/store/serviceRequests';
import type { AppDispatch, RootState } from '@/store';
import ModalSheet from '@/components/base/ModalSheet';
import type { PublicServiceRequest } from '@/types/services';
import styles from './PublicRequests.module.scss';

const formatDate = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const formatStatus = (status: string) =>
  status
    ? status
        .split('_')
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(' ')
    : '';

const toPreview = (value?: string, limit = 160) => {
  if (!value) return '';
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}…`;
};

const PublicRequests = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const publicState = useSelector((state: RootState) => state.serviceRequests.publicList);
  const currentUserId = useSelector(
    (state: RootState) => state.userProfile.item?.id ?? state.auth.user?.id ?? null
  );
  const isAuthenticated = Boolean(useSelector((state: RootState) => state.auth.token));
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] = useState<PublicServiceRequest | null>(null);
  const [helperNote, setHelperNote] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');

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

  const openOfferModal = (request: PublicServiceRequest) => {
    setActiveRequest(request);
    setHelperNote('');
    setExpectedReturn(request.paymentOffer ?? '');
  };

  const handleSubmitOffer = async () => {
    if (!activeRequest) return;
    setSubmitting(activeRequest._id);
    try {
      await dispatch(
        submitServiceOffer({ requestId: activeRequest._id, payload: { helperNote, expectedReturn } })
      ).unwrap();
      showToast('Offer submitted', 'success');
      setActiveRequest(null);
      dispatch(fetchPublicServiceRequests({ page: publicState.page }));
      dispatch(fetchAssignedServiceRequests());
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to submit offer';
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
              {request.message || request.details || request.description ? (
                <p className={styles.description}>
                  {toPreview(request.message || request.details || request.description)}
                </p>
              ) : null}
              <div className={styles.meta}>
                {request.location ? <span>{request.location}</span> : null}
                {request.createdAt ? <span>Posted {formatDate(request.createdAt)}</span> : null}
                <span className={styles.chip}>{formatStatus(request.status)}</span>
                {request.acceptedBy ? <span>Accepted</span> : <span>{request.offersCount} offers</span>}
              </div>
              {isAuthenticated ? (
                <Button
                  className={styles.offerButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    openOfferModal(request);
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
      <ModalSheet open={Boolean(activeRequest)} onClose={() => setActiveRequest(null)}>
        <div className={styles.offerModal}>
          <h2>Offer help</h2>
          <p className={styles.modalSubtitle}>{activeRequest?.title}</p>
          <label className={styles.fieldLabel} htmlFor="helper-note">
            Note to requester
          </label>
          <textarea
            id="helper-note"
            value={helperNote}
            onChange={(e) => setHelperNote(e.target.value)}
            placeholder="Share how you can help"
          />
          <label className={styles.fieldLabel} htmlFor="expected-return">
            Expected return / payment
          </label>
          <input
            id="expected-return"
            type="text"
            value={expectedReturn}
            onChange={(e) => setExpectedReturn(e.target.value)}
            placeholder="Optional"
          />
          <div className={styles.modalActions}>
            <Button onClick={() => void handleSubmitOffer()} disabled={!activeRequest || submitting === activeRequest._id}>
              {submitting === activeRequest?._id ? 'Submitting…' : 'Submit offer'}
            </Button>
            <Button variant="secondary" onClick={() => setActiveRequest(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </ModalSheet>
    </div>
  );
};

export default PublicRequests;
