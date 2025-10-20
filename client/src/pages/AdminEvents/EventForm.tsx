import { forwardRef } from 'react';
import DateTimePicker from '../../components/common/DateTimePicker';
import styles from './AdminEvents.module.scss';

export interface EventFormValues {
  title: string;
  startAt: string;
  endAt: string;
  capacity: string;
}

export type EventFormErrors = Partial<Record<keyof EventFormValues, string>>;

interface EventFormProps {
  heading: string;
  values: EventFormValues;
  errors: EventFormErrors;
  saving: boolean;
  submitLabel: string;
  onChange: (changes: Partial<EventFormValues>) => void;
  onSubmit: (values: EventFormValues) => void;
  onCancel: () => void;
}

const EventForm = forwardRef<HTMLFormElement, EventFormProps>(
  (
    {
      heading,
      values,
      errors,
      saving,
      submitLabel,
      onChange,
      onSubmit,
      onCancel,
    },
    ref,
  ) => {
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onSubmit(values);
    };

    return (
      <form ref={ref} className={styles.modalContent} onSubmit={handleSubmit}>
        <h3>{heading}</h3>
        <div className={styles.formField}>
          <label htmlFor="event-title">Title</label>
          <input
            id="event-title"
            value={values.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Community meetup"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'event-title-error' : undefined}
            autoComplete="off"
            required
          />
          {errors.title ? (
            <p id="event-title-error" className={styles.fieldError}>
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className={styles.formFieldGrid}>
          <DateTimePicker
            id="event-start"
            label="Start"
            value={values.startAt}
            onChange={(startAt) => onChange({ startAt })}
            error={errors.startAt}
            required
          />
          <DateTimePicker
            id="event-end"
            label="End"
            value={values.endAt}
            onChange={(endAt) => onChange({ endAt })}
            error={errors.endAt}
            min={values.startAt || undefined}
            required
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="event-capacity">Capacity</label>
          <input
            id="event-capacity"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={values.capacity}
            onChange={(e) => onChange({ capacity: e.target.value })}
            aria-invalid={Boolean(errors.capacity)}
            aria-describedby={errors.capacity ? 'event-capacity-error' : undefined}
            required
          />
          {errors.capacity ? (
            <p id="event-capacity-error" className={styles.fieldError}>
              {errors.capacity}
            </p>
          ) : null}
        </div>

        <div className={styles.modalActions}>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : submitLabel}
          </button>
          <button type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    );
  },
);

EventForm.displayName = 'EventForm';

export default EventForm;
