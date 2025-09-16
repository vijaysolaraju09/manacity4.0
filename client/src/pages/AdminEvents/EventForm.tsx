import { forwardRef } from 'react';

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
      <form ref={ref} className="modal-content modal-content--form" onSubmit={handleSubmit}>
        <h3>{heading}</h3>
        <div className="form-field">
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
            <p id="event-title-error" className="field-error">
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="form-field-grid">
          <div className="form-field">
            <label htmlFor="event-start">Start</label>
            <input
              id="event-start"
              type="datetime-local"
              value={values.startAt}
              onChange={(e) => onChange({ startAt: e.target.value })}
              aria-invalid={Boolean(errors.startAt)}
              aria-describedby={errors.startAt ? 'event-start-error' : undefined}
              required
            />
            {errors.startAt ? (
              <p id="event-start-error" className="field-error">
                {errors.startAt}
              </p>
            ) : null}
          </div>
          <div className="form-field">
            <label htmlFor="event-end">End</label>
            <input
              id="event-end"
              type="datetime-local"
              value={values.endAt}
              onChange={(e) => onChange({ endAt: e.target.value })}
              aria-invalid={Boolean(errors.endAt)}
              aria-describedby={errors.endAt ? 'event-end-error' : undefined}
              required
            />
            {errors.endAt ? (
              <p id="event-end-error" className="field-error">
                {errors.endAt}
              </p>
            ) : null}
          </div>
        </div>

        <div className="form-field">
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
            <p id="event-capacity-error" className="field-error">
              {errors.capacity}
            </p>
          ) : null}
        </div>

        <div className="modal-actions">
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
