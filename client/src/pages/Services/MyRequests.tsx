import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from '@/components/ui/button';
import SkeletonList from '@/components/ui/SkeletonList';
import showToast from '@/components/ui/Toast';
import {
  actOnServiceOffer,
  cancelServiceRequest,
  fetchMyServiceRequests,
  fetchServiceRequestOffers,
  updateServiceRequest,
} from '@/store/serviceRequests';
import type { AppDispatch, RootState } from '@/store';
import type { ServiceRequest, ServiceRequestOffer } from '@/types/services';
import ModalSheet from '@/components/base/ModalSheet';
import styles from './MyRequests.module.scss';

const formatOfferStatus = (status: ServiceRequestOffer['status']) =>
  status
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

import { formatServiceStatus, normalizeServiceStatus } from '@/utils/serviceStatus';

const MyRequests = () => {
  const dispatch = useDispatch<AppDispatch>();
  const mineState = useSelector((state: RootState) => state.serviceRequests.mine);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [editing, setEditing] = useState<ServiceRequest | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [paymentOffer, setPaymentOffer] = useState('');
  const offersFetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (mineState.status === 'idle') {
      dispatch(fetchMyServiceRequests());
    }
  }, [dispatch, mineState.status]);

  const items = useMemo(() => mineState.items ?? [], [mineState.items]);

  useEffect(() => {
    const publicRequests = items.filter((request) => request.type === 'public');
    publicRequests.forEach((request) => {
      if (offersFetchedRef.current.has(request._id)) return;
      offersFetchedRef.current.add(request._id);
      dispatch(fetchServiceRequestOffers(request._id))
        .unwrap()
        .catch((err) => {
          offersFetchedRef.current.delete(request._id);
          const message = typeof err === 'string' ? err : 'Failed to load offers';
          showToast(message, 'error');
        });
    });
  }, [dispatch, items]);

  const startAction = (id: string, action: string) => {
    setPendingId(id);
    setPendingAction(action);
  };

  const finishAction = () => {
    setPendingId(null);
    setPendingAction(null);
  };

  const handleOfferAction = async (
    requestId: string,
    offerId: string,
    action: 'accept' | 'reject'
  ) => {
    startAction(requestId, action);
    try {
      await dispatch(actOnServiceOffer({ requestId, offerId, payload: { action } })).unwrap();
      showToast(`Offer ${action === 'accept' ? 'accepted' : 'rejected'}`, 'success');
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to update offer';
      showToast(message, 'error');
    } finally {
      finishAction();
    }
  };

  const handleCancel = async (requestId: string) => {
    const confirmCancel = window.confirm('Cancel this request?');
    if (!confirmCancel) return;
    startAction(requestId, 'cancel');
    try {
      await dispatch(cancelServiceRequest(requestId)).unwrap();
      showToast('Request cancelled', 'success');
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to cancel request';
      showToast(message, 'error');
    } finally {
      finishAction();
    }
  };

  const openEditor = (request: ServiceRequest) => {
    setEditing(request);
    setTitle(request.title || request.customName || '');
    setDescription(request.description || request.details || request.message || '');
    setLocation(request.location || '');
    setPaymentOffer(request.paymentOffer || '');
  };

  const resetEditor = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setLocation('');
    setPaymentOffer('');
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    startAction(editing._id, 'edit');
    try {
      await dispatch(
        updateServiceRequest({
          id: editing._id,
          changes: {
            title: title.trim() || editing.title || editing.customName,
            description: description.trim() || undefined,
            message: description.trim() || undefined,
            details: description.trim() || undefined,
            location: location.trim() || undefined,
            paymentOffer: paymentOffer.trim() || undefined,
          },
        })
      ).unwrap();
      showToast('Request updated', 'success');
      resetEditor();
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to update request';
      showToast(message, 'error');
    } finally {
      finishAction();
    }
  };

  const isLoading = mineState.status === 'loading';

  return (
    <div className={styles.page}>
      {isLoading ? (
        <SkeletonList count={3} />
      ) : mineState.error ? (
        <div className={styles.error}>{mineState.error}</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <p>You have no service requests yet.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((request) => {
            const offers = Array.isArray(request.offers) ? request.offers : [];
            const assignedName = request.assignedProvider?.name;
            const normalizedStatus = normalizeServiceStatus(request.status);
            const canEdit = ['pending', 'awaiting_approval'].includes(normalizedStatus) && !request.acceptedBy;
            const acceptedHelper = request.acceptedHelper;

            return (
              <div key={request._id} className={styles.card}>
                <div className={styles.header}>
                  <div className={styles.title}>
                    {request.service?.name || request.customName || 'Service request'}
                  </div>
                  <div className={styles.statusRow}>
                    <span className={styles.badge}>{formatServiceStatus(request.status)}</span>
                    {assignedName ? <span>Assigned to {assignedName}</span> : null}
                    {request.reopenedCount > 0 ? (
                      <span>Reopened {request.reopenedCount} time(s)</span>
                    ) : null}
                  </div>
                  {acceptedHelper ? (
                    <div className={styles.acceptedHelper}>
                      <div className={styles.sectionTitle}>Accepted helper</div>
                      <div className={styles.helperRow}>
                        <span>{acceptedHelper.name || 'Helper'}</span>
                        {acceptedHelper.phone ? <span> · {acceptedHelper.phone}</span> : null}
                      </div>
                    </div>
                  ) : null}
                </div>

                {request.description ? <p>{request.description}</p> : null}
                {request.adminNotes ? (
                  <div className={styles.notes}>
                    <span className={styles.sectionTitle}>Admin notes</span>
                    <p>{request.adminNotes}</p>
                  </div>
                ) : null}

                <div className={styles.sectionTitle}>Offers</div>
                {offers.length === 0 ? (
                  <p>No offers yet.</p>
                ) : (
                  <div className={styles.offerList}>
                    {offers.map((offer: ServiceRequestOffer) => (
                      <div key={offer._id} className={styles.offer}>
                        <div className={styles.offerMeta}>
                          <span>{offer.helper?.name || offer.provider?.name || 'Provider'}</span>
                          <span className={styles.badge}>{formatOfferStatus(offer.status)}</span>
                          {offer.expectedReturn ? <span>Offer: {offer.expectedReturn}</span> : null}
                          {offer.createdAt ? <span>{new Date(offer.createdAt).toLocaleString()}</span> : null}
                        </div>
                        {offer.note || offer.helperNote ? <p>{offer.note || offer.helperNote}</p> : null}
                        {offer.status === 'pending' && !request.acceptedBy ? (
                          <div className={styles.offerActions}>
                            <Button
                              onClick={() => handleOfferAction(request._id, offer._id, 'accept')}
                              disabled={pendingId === request._id}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleOfferAction(request._id, offer._id, 'reject')}
                              disabled={pendingId === request._id}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    onClick={() => handleCancel(request._id)}
                    disabled={!canEdit || pendingId === request._id}
                  >
                    {pendingId === request._id && pendingAction === 'cancel' ? 'Cancelling…' : 'Cancel request'}
                  </Button>
                  {canEdit ? (
                    <Button onClick={() => openEditor(request)} disabled={pendingId === request._id}>
                      Edit
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalSheet open={Boolean(editing)} onClose={resetEditor}>
        <form className={styles.editForm} onSubmit={handleEditSubmit}>
          <h2 className={styles.modalTitle}>Edit request</h2>
          <label className={styles.fieldLabel} htmlFor="edit-title">
            Title
          </label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />

          <label className={styles.fieldLabel} htmlFor="edit-description">
            Details
          </label>
          <textarea
            id="edit-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />

          <label className={styles.fieldLabel} htmlFor="edit-location">
            Location
          </label>
          <input
            id="edit-location"
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Area or landmark"
          />

          <label className={styles.fieldLabel} htmlFor="edit-payment">
            Payment offer (optional)
          </label>
          <input
            id="edit-payment"
            type="text"
            value={paymentOffer}
            onChange={(event) => setPaymentOffer(event.target.value)}
            placeholder="e.g. ₹500"
          />

          <div className={styles.modalActions}>
            <Button type="submit" disabled={pendingAction === 'edit'}>
              {pendingAction === 'edit' ? 'Saving…' : 'Save changes'}
            </Button>
            <Button type="button" variant="secondary" onClick={resetEditor}>
              Cancel
            </Button>
          </div>
        </form>
      </ModalSheet>
    </div>
  );
};

export default MyRequests;
