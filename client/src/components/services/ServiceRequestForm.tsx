import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/button';
import styles from './ServiceRequestForm.module.scss';
import type { CreateServiceRequestPayload, Service } from '@/types/services';

interface ServiceRequestFormProps {
  services: Service[];
  onSubmit: (payload: CreateServiceRequestPayload) => void;
  submitting?: boolean;
  error?: string | null;
  successMessage?: string | null;
  initialServiceId?: string;
  initialPhone?: string;
  initialCustomName?: string;
  initialVisibility?: 'public' | 'private';
}

const OTHER_OPTION = 'other';

const ServiceRequestForm = ({
  services,
  onSubmit,
  submitting,
  error,
  successMessage,
  initialServiceId,
  initialPhone,
  initialCustomName,
  initialVisibility = 'public',
}: ServiceRequestFormProps) => {
  const serviceOptions = useMemo(() => services ?? [], [services]);
  const initialSelection = useMemo(() => {
    if (!initialServiceId) return '';
    const exists = serviceOptions.some((service) => service._id === initialServiceId || service.id === initialServiceId);
    return exists ? initialServiceId : '';
  }, [serviceOptions, initialServiceId]);

  const [serviceId, setServiceId] = useState<string>(initialSelection);
  const [customName, setCustomName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>(initialVisibility);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasAppliedInitialService, setHasAppliedInitialService] = useState(false);
  const [hasAppliedInitialCustomName, setHasAppliedInitialCustomName] = useState(false);

  useEffect(() => {
    if (successMessage) {
      setServiceId(initialSelection);
      setCustomName('');
      setDescription('');
      setLocation('');
      setPhone(initialPhone ?? '');
      setPreferredDate('');
      setPreferredTime('');
      setVisibility(initialVisibility);
      setLocalError(null);
    }
  }, [successMessage, initialSelection, initialPhone, initialVisibility]);

  useEffect(() => {
    if (initialSelection && !hasAppliedInitialService) {
      setServiceId(initialSelection);
      setHasAppliedInitialService(true);
    }
  }, [initialSelection, hasAppliedInitialService]);

  useEffect(() => {
    if (typeof initialCustomName === 'string' && !hasAppliedInitialCustomName) {
      setCustomName(initialCustomName);
      setHasAppliedInitialCustomName(true);
    }
  }, [initialCustomName, hasAppliedInitialCustomName]);

  useEffect(() => {
    if (initialPhone) {
      setPhone((prev) => (prev ? prev : initialPhone));
    }
  }, [initialPhone]);

  const showCustomField = !serviceId || serviceId === OTHER_OPTION;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedCustom = customName.trim();
    if (showCustomField && trimmedCustom.length === 0) {
      setLocalError('Please describe the service you need.');
      return;
    }
    setLocalError(null);

    const payload: CreateServiceRequestPayload = {
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      phone: phone.trim() || undefined,
      preferredDate: preferredDate || undefined,
      preferredTime: preferredTime || undefined,
    };

    if (!showCustomField && serviceId) payload.serviceId = serviceId;
    if (showCustomField && trimmedCustom) payload.customName = trimmedCustom;
    payload.visibility = visibility;

    onSubmit(payload);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="service" className={styles.label}>
          Service needed
        </label>
        <select
          id="service"
          name="service"
          className={styles.select}
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
          disabled={submitting}
        >
          <option value="">Select a service</option>
          {serviceOptions.map((service) => (
            <option key={service._id} value={service._id}>
              {service.name}
            </option>
          ))}
          <option value={OTHER_OPTION}>Other / Not listed</option>
        </select>
        <p className={styles.hint}>Can&apos;t find your need? Choose other and tell us more.</p>
      </div>

      {showCustomField ? (
        <div className={styles.field}>
          <label htmlFor="customName" className={styles.label}>
            Describe the service
          </label>
          <input
            id="customName"
            name="customName"
            className={styles.input}
            type="text"
            placeholder="e.g. Deep cleaning, event photography"
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            disabled={submitting}
            required
          />
        </div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="description" className={styles.label}>
          Additional details
        </label>
        <textarea
          id="description"
          name="description"
          className={styles.textarea}
          placeholder="Share details that help us find the right provider"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="location" className={styles.label}>
          Location / Landmark
        </label>
        <input
          id="location"
          name="location"
          className={styles.input}
          type="text"
          placeholder="Apartment, street or area"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="phone" className={styles.label}>
          Contact phone
        </label>
        <input
          id="phone"
          name="phone"
          className={styles.input}
          type="tel"
          placeholder="We&apos;ll share this with assigned providers"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Visibility</span>
        <div className={styles.choiceRow}>
          <label className={styles.choice}>
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
              disabled={submitting}
            />
            <span>
              Public – providers can discover this request. Your contact details stay hidden until you
              accept an offer.
            </span>
          </label>
          <label className={styles.choice}>
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={visibility === 'private'}
              onChange={() => setVisibility('private')}
              disabled={submitting}
            />
            <span>Private – only admins can view and assign providers.</span>
          </label>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Preferred time</label>
        <div className={styles.actions}>
          <input
            type="date"
            className={styles.input}
            value={preferredDate}
            onChange={(event) => setPreferredDate(event.target.value)}
            disabled={submitting}
          />
          <input
            type="time"
            className={styles.input}
            value={preferredTime}
            onChange={(event) => setPreferredTime(event.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      {localError ? <div className={styles.error}>{localError}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {successMessage ? <div className={styles.success}>{successMessage}</div> : null}

      <div className={styles.actions}>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit request'}
        </Button>
      </div>
    </form>
  );
};

export default ServiceRequestForm;
