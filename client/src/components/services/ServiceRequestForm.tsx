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
  const defaultDate = useMemo(() => {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    return iso;
  }, []);
  const defaultTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 60);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }, []);
  const initialSelection = useMemo(() => {
    if (!initialServiceId) return '';
    const exists = serviceOptions.some((service) => service._id === initialServiceId || service.id === initialServiceId);
    return exists ? initialServiceId : '';
  }, [serviceOptions, initialServiceId]);

  const [serviceId, setServiceId] = useState<string>(initialSelection);
  const [customName, setCustomName] = useState('');
  const [details, setDetails] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [preferredDate, setPreferredDate] = useState(defaultDate);
  const [preferredTime, setPreferredTime] = useState(defaultTime);
  const [visibility, setVisibility] = useState<'public' | 'private'>(initialVisibility);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasAppliedInitialService, setHasAppliedInitialService] = useState(false);
  const [hasAppliedInitialCustomName, setHasAppliedInitialCustomName] = useState(false);

  useEffect(() => {
    if (successMessage) {
      setServiceId(initialSelection);
      setCustomName('');
      setDetails('');
      setLocation('');
      setPhone(initialPhone ?? '');
      setPreferredDate(defaultDate);
      setPreferredTime(defaultTime);
      setVisibility(initialVisibility);
      setLocalError(null);
    }
  }, [defaultDate, defaultTime, initialSelection, initialPhone, initialVisibility, successMessage]);

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

  useEffect(() => {
    if (serviceOptions.length === 1 && !serviceId) {
      setServiceId(serviceOptions[0]._id ?? serviceOptions[0].id ?? '');
    }
  }, [serviceId, serviceOptions]);

  const showCustomField = !serviceId || serviceId === OTHER_OPTION;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedCustom = customName.trim();
    if (showCustomField && trimmedCustom.length === 0) {
      setLocalError('Please describe the service you need.');
      return;
    }
    setLocalError(null);

    const trimmedDetails = details.trim();
    const trimmedPhone = phone.trim();
    const payload: CreateServiceRequestPayload = {
      location: location.trim() || undefined,
      preferredDate: preferredDate || undefined,
      preferredTime: preferredTime || undefined,
    };
    if (trimmedDetails) {
      payload.description = trimmedDetails;
      payload.details = trimmedDetails;
    }
    if (trimmedPhone) {
      payload.phone = trimmedPhone;
      payload.contactPhone = trimmedPhone;
    }

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
          aria-invalid={showCustomField && !customName}
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
            autoComplete="off"
            inputMode="text"
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
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className={styles.inlineGrid}>
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
            autoComplete="street-address"
            inputMode="text"
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
            autoComplete="tel"
            inputMode="tel"
          />
        </div>
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
        <div className={styles.datetimeRow}>
          <input
            type="date"
            className={styles.input}
            value={preferredDate}
            onChange={(event) => setPreferredDate(event.target.value)}
            disabled={submitting}
            required
            min={defaultDate}
            aria-label="Preferred date"
            inputMode="numeric"
          />
          <input
            type="time"
            className={styles.input}
            value={preferredTime}
            onChange={(event) => setPreferredTime(event.target.value)}
            disabled={submitting}
            required
            aria-label="Preferred time"
            inputMode="numeric"
          />
        </div>
        <div className={styles.quickTimes}>
          {[{ label: 'Morning', value: '09:00' }, { label: 'Afternoon', value: '13:00' }, { label: 'Evening', value: '18:00' }].map(
            (preset) => (
              <button
                key={preset.value}
                type="button"
                className={styles.chipButton}
                onClick={() => setPreferredTime(preset.value)}
                disabled={submitting}
              >
                {preset.label}
              </button>
            ),
          )}
        </div>
      </div>

      <div className={styles.feedback} aria-live="polite">
        {localError ? <div className={styles.error}>{localError}</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {successMessage ? <div className={styles.success}>{successMessage}</div> : null}
      </div>

      <div className={styles.submitRow}>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit request'}
        </Button>
      </div>
    </form>
  );
};

export default ServiceRequestForm;
