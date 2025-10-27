import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Phone, RefreshCcw, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '@/store';
import {
  fetchAssignedRequests,
  updateAssignedRequestStatus,
  revertStatus,
  type ProviderServiceRequest,
} from '@/store/providerServiceRequests';
import showToast from '@/components/ui/Toast';
import { toErrorMessage } from '@/lib/response';
import StatusChip, { type Status } from '@/components/ui/StatusChip';
import EmptyState from '@/components/ui/EmptyState';
import ErrorCard from '@/components/ui/ErrorCard';
import SkeletonList from '@/components/ui/SkeletonList';
import { cn } from '@/lib/utils';
import { paths } from '@/routes/paths';
import styles from './ServiceOrders.module.scss';

const determineNextLabel = (status: ProviderServiceRequest['status']) => {
  switch (status) {
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'assigned':
      return 'Assigned';
    case 'open':
      return 'Open';
    default:
      return status.replace(/_/g, ' ');
  }
};

const ServiceOrders = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items, status, error, updating } = useSelector(
    (state: RootState) => state.providerServiceRequests,
  );
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const isBusiness = userRole === 'business';
  const isLoading = status === 'loading';
  const hasItems = items.length > 0;

  useEffect(() => {
    if (isBusiness && status === 'idle') {
      dispatch(fetchAssignedRequests());
    }
  }, [dispatch, status, isBusiness]);

  const handleRefresh = () => {
    if (isBusiness) {
      dispatch(fetchAssignedRequests());
    }
  };

  const handleStatusChange = async (
    request: ProviderServiceRequest,
    nextStatus: ProviderServiceRequest['status'],
  ) => {
    if (request.status === nextStatus) return;
    const previousStatus = request.status;
    try {
      await dispatch(updateAssignedRequestStatus({ id: request.id, status: nextStatus })).unwrap();
      const label = nextStatus === 'in_progress' ? 'in progress' : 'completed';
      showToast(`Request marked ${label}.`, 'success');
    } catch (err) {
      dispatch(revertStatus({ id: request.id, status: previousStatus }));
      showToast(toErrorMessage(err), 'error');
    }
  };

  const renderBody = () => {
    if (!isBusiness) {
      return (
        <EmptyState
          title="Business access required"
          message="Only approved business accounts can manage service orders. Visit your profile to request business verification."
          ctaLabel="Go to profile"
          onCtaClick={() => {
            navigate(paths.profile());
          }}
        />
      );
    }

    if (isLoading && !hasItems) {
      return <SkeletonList count={3} lines={4} className={styles.listSkeleton} />;
    }

    if (error && !hasItems) {
      return <ErrorCard message={error} onRetry={handleRefresh} />;
    }

    if (!hasItems) {
      return (
        <EmptyState
          title="No assigned requests yet"
          message="When customers assign you to a service request, it will appear here for easy tracking."
          ctaLabel="Refresh"
          onCtaClick={handleRefresh}
        />
      );
    }

    return (
      <ul className={styles.list} aria-live="polite">
        {items.map((request) => {
          const isUpdating = Boolean(updating[request.id]);
          const callLabel = request.customerName
            ? `Call ${request.customerName}`
            : 'Call customer';
          const canMarkInProgress =
            request.status !== 'in_progress' && request.status !== 'completed';
          const canMarkCompleted = request.status !== 'completed';
          return (
            <li key={request.id} className={styles.card}>
              <header className={styles.cardHeader}>
                <div>
                  <p className={styles.cardTitle}>{request.title}</p>
                  <p className={styles.metaLine}>
                    <Clock className={styles.metaIcon} aria-hidden="true" />
                    <span>
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleString()
                        : 'Created date unavailable'}
                    </span>
                  </p>
                </div>
                <StatusChip status={request.status as Status} className={styles.status} />
              </header>
              <p className={styles.description}>{request.description}</p>
              <dl className={styles.details}>
                {request.customerName ? (
                  <div>
                    <dt>Customer</dt>
                    <dd>{request.customerName}</dd>
                  </div>
                ) : null}
                {request.location ? (
                  <div>
                    <dt>Location</dt>
                    <dd>{request.location}</dd>
                  </div>
                ) : null}
              </dl>
              <div className={styles.actions}>
                {request.phone ? (
                  <a
                    href={`tel:${request.phone}`}
                    className={cn(styles.actionButton, styles.outlineButton)}
                    aria-label={callLabel}
                  >
                    <Phone className={styles.actionIcon} aria-hidden="true" />
                    <span>Call</span>
                  </a>
                ) : null}
                <div className={styles.actionGroup}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => handleStatusChange(request, 'in_progress')}
                    disabled={!canMarkInProgress || isUpdating}
                    aria-label={`Mark request ${determineNextLabel(request.status)} as in progress`}
                  >
                    <Clock className={styles.actionIcon} aria-hidden="true" />
                    <span>{isUpdating && updating[request.id] === 'in_progress' ? 'Updating…' : 'Start work'}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => handleStatusChange(request, 'completed')}
                    disabled={!canMarkCompleted || isUpdating}
                    aria-label={`Mark request ${determineNextLabel(request.status)} as completed`}
                  >
                    <CheckCircle2 className={styles.actionIcon} aria-hidden="true" />
                    <span>
                      {isUpdating && updating[request.id] === 'completed'
                        ? 'Updating…'
                        : 'Mark complete'}
                    </span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section className={styles.page} aria-labelledby="provider-service-orders-heading">
      <header className={styles.header}>
        <div>
          <h2 id="provider-service-orders-heading" className={styles.heading}>
            Service orders
          </h2>
          <p className={styles.subtitle}>
            Track service requests assigned to your business and update their progress for customers.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className={cn(styles.actionButton, styles.outlineButton)}
          aria-label="Refresh service requests"
          disabled={!isBusiness}
        >
          <RefreshCcw className={styles.actionIcon} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </header>
      {userRole !== 'business' ? (
        <div className={styles.notice} role="note">
          <p>
            Service orders are available for approved business accounts. You can update your profile to request business
            access if you need to manage customer assignments.
          </p>
        </div>
      ) : null}
      {renderBody()}
    </section>
  );
};

export default ServiceOrders;
