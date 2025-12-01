import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import Button from '@/components/ui/button';
import ModalSheet from '@/components/base/ModalSheet';
import showToast from '@/components/ui/Toast';
import { paths } from '@/routes/paths';
import {
  createServiceRequest,
  fetchAssignedServiceRequests,
  fetchMyServiceRequests,
  fetchPublicServiceRequests,
} from '@/store/serviceRequests';
import type { AppDispatch, RootState } from '@/store';
import { useDispatch, useSelector } from 'react-redux';
import styles from './ServicesHub.module.scss';

const ServicesHub = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();
  const createStatus = useSelector((state: RootState) => state.serviceRequests.createStatus);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [paymentOffer, setPaymentOffer] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');

  const catalogPath = paths.services.catalog();
  const requestsPath = paths.services.requests();
  const myRequestsPath = paths.serviceRequests.mine();
  const myServicesPath = paths.services.myServices();

  const normalizedPath =
    location.pathname.endsWith('/') && location.pathname !== '/'
      ? location.pathname.slice(0, -1)
      : location.pathname;

  const isCatalogRoute = normalizedPath === catalogPath;
  const isRequestsRoute = normalizedPath === requestsPath;
  const isMyRequestsRoute = normalizedPath === myRequestsPath;
  const isMyServicesRoute = normalizedPath === myServicesPath;

  const handlePrimaryTab = (target: 'catalog' | 'requests' | 'myRequests' | 'myServices') => {
    if (target === 'catalog') {
      navigate(catalogPath);
      return;
    }

    if (target === 'requests') {
      navigate(requestsPath);
      return;
    }

    if (target === 'myServices') {
      navigate(myServicesPath);
      return;
    }

    navigate(myRequestsPath);
  };

  const handleCreateRequest = () => {
    setShowRequestModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await dispatch(
        createServiceRequest({ title, message, description: message, location: locationInput, paymentOffer, type })
      ).unwrap();
      showToast('Request submitted successfully', 'success');
      setShowRequestModal(false);
      setTitle('');
      setMessage('');
      setLocationInput('');
      setPaymentOffer('');
      setType('public');
      dispatch(fetchMyServiceRequests());
      dispatch(fetchPublicServiceRequests(undefined));
      dispatch(fetchAssignedServiceRequests());
    } catch (err) {
      const messageText = typeof err === 'string' ? err : 'Failed to submit request';
      showToast(messageText, 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Services</h1>
          <Button className={styles.createButton} onClick={handleCreateRequest}>
            <Plus aria-hidden="true" className={styles.createIcon} />
            Request Service
          </Button>
        </div>
        <div className={styles.navRow}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={isCatalogRoute ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => handlePrimaryTab('catalog')}
              aria-current={isCatalogRoute ? 'page' : undefined}
            >
              Available Services
            </button>
            <button
              type="button"
              className={isRequestsRoute ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => handlePrimaryTab('requests')}
              aria-current={isRequestsRoute ? 'page' : undefined}
            >
              Public Requests
            </button>
            <button
              type="button"
              className={isMyRequestsRoute ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => handlePrimaryTab('myRequests')}
              aria-current={isMyRequestsRoute ? 'page' : undefined}
            >
              My Requests
            </button>
            <button
              type="button"
              className={isMyServicesRoute ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => handlePrimaryTab('myServices')}
              aria-current={isMyServicesRoute ? 'page' : undefined}
            >
              My Services
            </button>
          </div>
        </div>
      </div>
      <div className={styles.content}>
        <Outlet />
      </div>
      <ModalSheet open={showRequestModal} onClose={() => setShowRequestModal(false)}>
        <form className={styles.requestForm} onSubmit={handleSubmit}>
          <h2 className={styles.modalTitle}>Raise a request</h2>
          <div className={styles.field}>
            <label htmlFor="request-title">Title</label>
            <input
              id="request-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="request-message">Message / details</label>
            <textarea
              id="request-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="request-location">Location</label>
            <input
              id="request-location"
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Area or landmark"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="request-payment">Payment offer (optional)</label>
            <input
              id="request-payment"
              type="text"
              value={paymentOffer}
              onChange={(e) => setPaymentOffer(e.target.value)}
              placeholder="e.g. ₹500"
            />
          </div>
          <div className={styles.field}>
            <span>Type</span>
            <div className={styles.choiceRow}>
              <label>
                <input
                  type="radio"
                  name="type"
                  value="public"
                  checked={type === 'public'}
                  onChange={() => setType('public')}
                />
                Public
              </label>
              <label>
                <input
                  type="radio"
                  name="type"
                  value="private"
                  checked={type === 'private'}
                  onChange={() => setType('private')}
                />
                Private
              </label>
            </div>
          </div>
          <div className={styles.modalActions}>
            <Button type="submit" disabled={createStatus === 'loading'}>
              {createStatus === 'loading' ? 'Submitting…' : 'Submit request'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setShowRequestModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </ModalSheet>
    </div>
  );
};

export default ServicesHub;
