import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ModalSheet from '@/components/base/ModalSheet';
import Button from '@/components/ui/button';
import SkeletonList from '@/components/ui/SkeletonList';
import showToast from '@/components/ui/Toast';
import { paths } from '@/routes/paths';
import {
  fetchPublicServiceRequests,
  submitServiceOffer,
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
  const isAuthenticated = Boolean(useSelector((state: RootState) => state.auth.token));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (publicState.status === 'idle') {
      dispatch(fetchPublicServiceRequests(undefined));
    }
  }, [dispatch, publicState.status]);

  const items = useMemo(() => publicState.items ?? [], [publicState.items]);
  const selectedRequest = useMemo(
    () => items.find((item) => item._id === selectedId) ?? null,
    [items, selectedId]
  );

  const handleRefresh = () => {
    dispatch(fetchPublicServiceRequests({ page: publicState.page }));
  };

  const handleOffer = (id: string) => {
    setSelectedId(id);
    setNote('');
    setContact('');
  };

  const closeModal = () => {
    if (submitting) return;
    setSelectedId(null);
    setNote('');
    setContact('');
  };

  const handleSubmit = async () => {
    if (!selectedId) return;
    const payload = {
      note: note.trim() || undefined,
      contact: contact.trim(),
    };
    if (!payload.contact) {
      showToast('Please add a contact number or email.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await dispatch(submitServiceOffer({ requestId: selectedId, payload })).unwrap();
      showToast('Offer submitted', 'success');
      setSelectedId(null);
      setNote('');
      setContact('');
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to submit offer';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
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
            <div key={request._id} className={styles.card}>
              <div className={styles.cardTitle}>{request.title}</div>
              {request.description ? (
                <p className={styles.description}>{request.description}</p>
              ) : null}
              <div className={styles.meta}>
                {request.location ? <span>{request.location}</span> : null}
                {request.createdAt ? <span>Posted {formatDate(request.createdAt)}</span> : null}
                <span className={styles.chip}>{formatStatus(request.status)}</span>
                <span>{request.offersCount} offers</span>
              </div>
              {isAuthenticated ? (
                <Button className={styles.offerButton} onClick={() => handleOffer(request._id)}>
                  Offer to help
                </Button>
              ) : null}
            </div>
          ))}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={handleRefresh}>
              Refresh
            </Button>
          </div>
        </div>
      )}

      <ModalSheet open={Boolean(selectedRequest)} onClose={closeModal}>
        <div className={styles.modal}>
          <h2>{selectedRequest?.title ?? 'Offer to help'}</h2>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="offer-note">
              Note (optional)
            </label>
            <textarea
              id="offer-note"
              className={styles.textarea}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="offer-contact">
              Contact information
            </label>
            <input
              id="offer-contact"
              className={styles.input}
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="Phone or alternate contact"
            />
          </div>
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit offer'}
            </Button>
          </div>
        </div>
      </ModalSheet>
    </div>
  );
};

export default PublicRequests;
