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
} from '@/store/serviceRequests';
import type { AppDispatch, RootState } from '@/store';
import type { ServiceRequest, ServiceRequestOffer } from '@/types/services';
import styles from './MyRequests.module.scss';

const statusLabel = (status: ServiceRequest['status']) =>
  status
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

const MyRequests = () => {
  const dispatch = useDispatch<AppDispatch>();
  const mineState = useSelector((state: RootState) => state.serviceRequests.mine);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
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
            const canEdit = ['pending', 'awaiting_approval'].includes(request.status) && !request.acceptedBy;
            const acceptedHelper = request.acceptedHelper;

            return (
              <div key={request._id} className={styles.card}>
                <div className={styles.header}>
                  <div className={styles.title}>
                    {request.service?.name || request.customName || 'Service request'}
                  </div>
                  <div className={styles.statusRow}>
                    <span className={styles.badge}>{statusLabel(request.status)}</span>
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
                          <span className={styles.badge}>{statusLabel(offer.status as ServiceRequest['status'])}</span>
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRequests;
