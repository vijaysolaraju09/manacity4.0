import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from '@/components/ui/button';
import SkeletonList from '@/components/ui/SkeletonList';
import showToast from '@/components/ui/Toast';
import {
  actOnServiceOffer,
  completeServiceRequest,
  fetchMyServiceRequests,
  reopenServiceRequest,
} from '@/store/serviceRequests';
import type { AppDispatch, RootState } from '@/store';
import type { ServiceRequest, ServiceRequestOffer } from '@/types/services';
import styles from './MyRequests.module.scss';

const statusLabel = (status: ServiceRequest['status']) =>
  status.charAt(0).toUpperCase() + status.slice(1);

const MyRequests = () => {
  const dispatch = useDispatch<AppDispatch>();
  const mineState = useSelector((state: RootState) => state.serviceRequests.mine);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    if (mineState.status === 'idle') {
      dispatch(fetchMyServiceRequests());
    }
  }, [dispatch, mineState.status]);

  const items = useMemo(() => mineState.items ?? [], [mineState.items]);

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

  const handleComplete = async (requestId: string) => {
    startAction(requestId, 'complete');
    try {
      await dispatch(completeServiceRequest({ id: requestId })).unwrap();
      showToast('Request marked as completed', 'success');
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to mark completed';
      showToast(message, 'error');
    } finally {
      finishAction();
    }
  };

  const handleReopen = async (requestId: string) => {
    const confirmReopen = window.confirm('Reopen this request? Providers will be notified.');
    if (!confirmReopen) return;
    startAction(requestId, 'reopen');
    try {
      await dispatch(reopenServiceRequest({ id: requestId })).unwrap();
      showToast('Request reopened', 'success');
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to reopen request';
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
            const canComplete = request.status === 'assigned';
            const canReopen = ['completed', 'closed'].includes(request.status);
            const reopenLimitReached = request.reopenedCount >= 3;
            const offers = Array.isArray(request.offers) ? request.offers : [];
            const assignedName = request.assignedProvider?.name;

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
                          <span>{offer.provider?.name || 'Provider'}</span>
                          <span className={styles.badge}>{offer.status}</span>
                          {offer.contact ? <span>Contact: {offer.contact}</span> : null}
                          {offer.createdAt ? <span>{new Date(offer.createdAt).toLocaleString()}</span> : null}
                        </div>
                        {offer.note ? <p>{offer.note}</p> : null}
                        {offer.status === 'pending' ? (
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
                    onClick={() => handleComplete(request._id)}
                    disabled={!canComplete || pendingId === request._id}
                  >
                    {pendingId === request._id && pendingAction === 'complete'
                      ? 'Updating…'
                      : 'Mark Completed'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleReopen(request._id)}
                    disabled={!canReopen || reopenLimitReached || pendingId === request._id}
                  >
                    {pendingId === request._id && pendingAction === 'reopen'
                      ? 'Reopening…'
                      : 'Reopen Request'}
                  </Button>
                  {reopenLimitReached ? <span>Reopen limit reached</span> : null}
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
