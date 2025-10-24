import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '@/store';
import { fetchEventById, resetEventDetail } from '@/store/events.slice';
import {
  fetchEventForm as fetchRegistrationForm,
  resetSubmission,
  submitRegistration,
} from '@/store/registrationsSlice';
import type { EventFormResolved, Field } from '@/types/forms';
import showToast from '@/components/ui/Toast';
import { http } from '@/lib/http';
import styles from './RegisterEvent.module.scss';

const sanitizeUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (error) {
    return false;
  }
};

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value;
};

const RegisterEventPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const formState = useSelector((state: RootState) => state.registrations.form);
  const submission = useSelector((state: RootState) => state.registrations.submission);
  const eventDetail = useSelector((state: RootState) => state.events.detail.data);
  const eventLoading = useSelector((state: RootState) => state.events.detail.loading);
  const eventError = useSelector((state: RootState) => state.events.detail.error);

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ enabled: boolean; amount: string; proofUrl: string }>(
    { enabled: false, amount: '', proofUrl: '' }
  );

  useEffect(() => {
    if (!id) return;
    dispatch(fetchEventById(id));
    dispatch(fetchRegistrationForm(id));
    return () => {
      dispatch(resetEventDetail());
      dispatch(resetSubmission());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (!formState.data) return;
    const { fields } = formState.data;
    setAnswers((prev) => {
      const next: Record<string, unknown> = {};
      fields.forEach((field) => {
        if (prev[field.id] !== undefined) {
          next[field.id] = prev[field.id];
        } else if (field.defaultValue !== undefined) {
          next[field.id] = field.defaultValue;
        } else if (field.type === 'checkbox') {
          next[field.id] = [];
        } else {
          next[field.id] = '';
        }
      });
      return next;
    });

    setFieldErrors((prev) => {
      const allowed = new Set(fields.map((field) => field.id));
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([fieldId, message]) => {
        if (allowed.has(fieldId)) {
          next[fieldId] = message;
        }
      });
      return next;
    });
  }, [formState.data]);

  useEffect(() => {
    if (eventDetail?.entryFee && eventDetail.entryFee > 0) {
      setPayment((prev) => {
        if (prev.enabled) return prev;
        return {
          enabled: true,
          amount: prev.amount || String(eventDetail.entryFee),
          proofUrl: prev.proofUrl,
        };
      });
    }
  }, [eventDetail?.entryFee]);

  useEffect(() => {
    if (submission.status === 'failed' && submission.error) {
      setGlobalError(submission.error);
    }
    if (submission.status === 'succeeded') {
      setGlobalError(null);
    }
  }, [submission.status, submission.error]);

  const fieldMap = useMemo(() => {
    const map = new Map<string, Field>();
    formState.data?.fields.forEach((field) => {
      map.set(field.id, field);
    });
    return map;
  }, [formState.data]);

  const validateFieldValue = useCallback((field: Field, rawValue: unknown): string | null => {
    if (field.type === 'checkbox') {
      const selected = Array.isArray(rawValue)
        ? rawValue.filter((item): item is string => typeof item === 'string')
        : [];
      if (field.required && selected.length === 0) {
        return 'Select at least one option';
      }
      const invalid = selected.some((value) => !field.options?.includes(value));
      return invalid ? 'Select a valid option' : null;
    }

    if (
      rawValue === undefined ||
      rawValue === null ||
      (typeof rawValue === 'string' && rawValue.trim().length === 0)
    ) {
      return field.required ? 'This field is required' : null;
    }

    switch (field.type) {
      case 'email': {
        const email = normalizeString(rawValue).trim();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Enter a valid email address';
      }
      case 'phone': {
        const phone = normalizeString(rawValue).replace(/[^0-9+]/g, '');
        return /^\+?\d{10,13}$/.test(phone) ? null : 'Enter a valid phone number';
      }
      case 'number': {
        const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
        if (!Number.isFinite(value)) {
          return 'Enter a valid number';
        }
        if (typeof field.min === 'number' && value < field.min) {
          return `Must be at least ${field.min}`;
        }
        if (typeof field.max === 'number' && value > field.max) {
          return `Must be at most ${field.max}`;
        }
        return null;
      }
      case 'dropdown':
      case 'radio': {
        const option = normalizeString(rawValue);
        if (!field.options?.includes(option)) {
          return 'Choose a valid option';
        }
        return null;
      }
      case 'url':
      case 'file': {
        const value = normalizeString(rawValue).trim();
        return sanitizeUrl(value) ? null : 'Enter a valid URL';
      }
      case 'datetime': {
        const timestamp = Date.parse(normalizeString(rawValue));
        return Number.isNaN(timestamp) ? 'Enter a valid date and time' : null;
      }
      default: {
        const text = normalizeString(rawValue);
        if (field.pattern) {
          try {
            const regex = new RegExp(field.pattern);
            if (!regex.test(text)) {
              return 'Value does not match the required format';
            }
          } catch (error) {
            // Ignore invalid patterns from the server; the server will still validate.
          }
        }
        return null;
      }
    }
  }, []);

  const handleAnswerChange = useCallback(
    (field: Field, value: unknown) => {
      setAnswers((prev) => ({ ...prev, [field.id]: value }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        const error = validateFieldValue(field, value);
        if (error) {
          next[field.id] = error;
        } else {
          delete next[field.id];
        }
        return next;
      });
      setGlobalError(null);
    },
    [validateFieldValue]
  );

  const handleCheckboxChange = useCallback(
    (field: Field, option: string, checked: boolean) => {
      const previous = Array.isArray(answers[field.id])
        ? (answers[field.id] as string[])
        : [];
      const next = checked
        ? Array.from(new Set([...previous, option]))
        : previous.filter((value) => value !== option);
      handleAnswerChange(field, next);
    },
    [answers, handleAnswerChange]
  );

  const validateForm = useCallback(
    (form: EventFormResolved) => {
      const errors: Record<string, string> = {};
      form.fields.forEach((field) => {
        const error = validateFieldValue(field, answers[field.id]);
        if (error) {
          errors[field.id] = error;
        }
      });
      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [answers, validateFieldValue]
  );

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await http.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = response?.data?.url ?? response?.data?.data?.url;
      if (typeof url === 'string' && url.length > 0) {
        return url;
      }
    } catch (error) {
      console.warn('File upload failed', error);
    }
    const fallback = URL.createObjectURL(file);
    showToast('File upload failed, using a temporary preview URL.', 'info');
    return fallback;
  }, []);

  const focusField = useCallback((fieldId: string) => {
    const element = document.getElementById(`field-${fieldId}`);
    if (element instanceof HTMLElement) {
      element.focus({ preventScroll: false });
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !formState.data) return;
    setGlobalError(null);

    const isValid = validateForm(formState.data);
    if (!isValid) {
      setGlobalError('Please fix the highlighted fields before submitting.');
      return;
    }

    let paymentPayload: { required: boolean; amount?: number; currency?: 'INR'; proofUrl?: string } | undefined;

    if (payment.enabled) {
      const trimmedAmount = payment.amount.trim();
      const trimmedProof = payment.proofUrl.trim();
      let parsedAmount: number | undefined;

      if (trimmedAmount) {
        const numeric = Number(trimmedAmount);
        if (!Number.isFinite(numeric) || numeric < 0) {
          const message = 'Enter a valid, non-negative payment amount.';
          setGlobalError(message);
          showToast(message, 'error');
          return;
        }
        parsedAmount = numeric;
      }

      if (trimmedProof && !sanitizeUrl(trimmedProof)) {
        const message = 'Enter a valid payment proof URL.';
        setGlobalError(message);
        showToast(message, 'error');
        return;
      }

      paymentPayload = {
        required: true,
        amount: parsedAmount,
        currency: 'INR',
        proofUrl: trimmedProof || undefined,
      };
    }

    try {
      await dispatch(
        submitRegistration({
          eventId: id,
          data: answers,
          payment: paymentPayload,
        })
      ).unwrap();
      showToast('Registration submitted successfully.', 'success');
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
          ? error.message
          : 'Unable to submit registration. Please try again.';
      setGlobalError(message);
      showToast(message, 'error');
    }
  };

  const loading = formState.loading || (!formState.data && eventLoading);

  const form = formState.data;
  const eventTitle = eventDetail?.title ?? 'the event';

  const isFormInactive = form?.isActive === false || form?.dynamicForm?.isActive === false;
  const isRegistrationClosed =
    form?.registration?.isOpen === false || eventDetail?.isRegistrationOpen === false;
  const registrationMessage =
    form?.registration?.closedReason ||
    form?.registration?.message ||
    (!eventDetail?.isRegistrationOpen ? 'Registrations for this event are currently closed.' : null);

  const errorSummaryItems = useMemo(() => {
    return Object.entries(fieldErrors).map(([fieldId, message]) => ({
      fieldId,
      message,
      label: fieldMap.get(fieldId)?.label ?? 'Field',
    }));
  }, [fieldErrors, fieldMap]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>Loading registration form…</div>
      </div>
    );
  }

  if (formState.error) {
    return (
      <div className={styles.page}>
        <div className={styles.card} role="alert">
          <h2 className={styles.cardTitle}>Registration unavailable</h2>
          <p>{formState.error}</p>
        </div>
      </div>
    );
  }

  if (eventError && !eventDetail) {
    return (
      <div className={styles.page}>
        <div className={styles.card} role="alert">
          <h2 className={styles.cardTitle}>Unable to load event</h2>
          <p>{eventError}</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>Registration form is not available.</div>
      </div>
    );
  }

  if (isFormInactive || isRegistrationClosed) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button type="button" onClick={() => navigate(-1)} className={styles.backLink}>
            ← Back to event
          </button>
          <h1>Register for {eventTitle}</h1>
        </div>
        <div className={styles.card} role="status" aria-live="polite">
          <h2 className={styles.cardTitle}>Registrations are currently closed</h2>
          <p>
            {registrationMessage ||
              'This event is not accepting new registrations right now. Please check back later.'}
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => navigate(`/events/${id}`)}
            >
              View event details
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submission.status === 'succeeded' && submission.result) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button type="button" onClick={() => navigate(`/events/${id}`)} className={styles.backLink}>
            ← Back to event
          </button>
          <h1>Registration complete</h1>
          <p>Thanks for registering for {eventTitle}.</p>
        </div>
        <section className={styles.successCard} role="status" aria-live="polite">
          <h2 className={styles.cardTitle}>You're on the list!</h2>
          <p>
            Keep this information handy. We'll also send a confirmation to your registered contact
            details.
          </p>
          <dl className={styles.detailsList}>
            <div>
              <dt>Registration ID</dt>
              <dd>{submission.result.id}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd className={styles.statusBadge}>{submission.result.status}</dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => navigate(`/events/${id}`)}
            >
              View event details
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => navigate('/events')}>
              Explore more events
            </button>
          </div>
        </section>
      </div>
    );
  }

  const renderField = (field: Field) => {
    const inputId = `field-${field.id}`;
    const error = fieldErrors[field.id];
    const helpId = field.help ? `${inputId}-help` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const requiredMarker = field.required ? (
      <span className={styles.requiredMarker} aria-hidden="true">
        *
      </span>
    ) : null;

    const commonProps = {
      id: inputId,
      name: field.id,
      onBlur: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = event.target.value;
        handleAnswerChange(field, field.type === 'number' ? (value === '' ? '' : Number(value)) : value);
      },
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = event.target.value;
        handleAnswerChange(field, field.type === 'number' ? (value === '' ? '' : Number(value)) : value);
      },
      required: field.required,
      disabled: submission.status === 'loading',
      'aria-invalid': Boolean(error) || undefined,
      'aria-describedby': [errorId, helpId].filter(Boolean).join(' ') || undefined,
      placeholder: field.placeholder,
      className: styles.input,
    } as const;

    const fieldClass = `${styles.field} ${error ? styles.invalid : ''}`;

    if (field.type === 'radio') {
      return (
        <fieldset key={field.id} className={fieldClass} aria-describedby={helpId}>
          <legend className={styles.legend}>
            {field.label}
            {requiredMarker}
          </legend>
          {field.help && (
            <p id={helpId} className={styles.helper}>
              {field.help}
            </p>
          )}
          <div className={styles.optionGroup}>
            {field.options?.map((option) => {
              const optionId = `${inputId}-${option}`;
              return (
                <label key={option} className={styles.checkboxRow} htmlFor={optionId}>
                  <input
                    type="radio"
                    id={optionId}
                    name={field.id}
                    value={option}
                    checked={answers[field.id] === option}
                    onChange={() => handleAnswerChange(field, option)}
                    required={field.required}
                    disabled={submission.status === 'loading'}
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
          {error && (
            <div id={errorId} className={styles.fieldError} role="alert">
              {error}
            </div>
          )}
        </fieldset>
      );
    }

    if (field.type === 'checkbox') {
      const selected = Array.isArray(answers[field.id]) ? (answers[field.id] as string[]) : [];
      return (
        <fieldset key={field.id} className={fieldClass} aria-describedby={helpId}>
          <legend className={styles.legend}>
            {field.label}
            {requiredMarker}
          </legend>
          {field.help && (
            <p id={helpId} className={styles.helper}>
              {field.help}
            </p>
          )}
          <div className={styles.optionGroup}>
            {field.options?.map((option) => {
              const optionId = `${inputId}-${option}`;
              const checked = selected.includes(option);
              return (
                <label key={option} className={styles.checkboxRow} htmlFor={optionId}>
                  <input
                    type="checkbox"
                    id={optionId}
                    name={`${field.id}[]`}
                    value={option}
                    checked={checked}
                    onChange={(event) => handleCheckboxChange(field, option, event.target.checked)}
                    disabled={submission.status === 'loading'}
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
          {error && (
            <div id={errorId} className={styles.fieldError} role="alert">
              {error}
            </div>
          )}
        </fieldset>
      );
    }

    let control: ReactElement | null = null;
    const currentValue = answers[field.id];

    switch (field.type) {
      case 'textarea':
      case 'long_text':
        control = (
          <textarea
            {...commonProps}
            id={inputId}
            rows={4}
            className={styles.textarea}
            value={normalizeString(currentValue)}
            onChange={(event) => handleAnswerChange(field, event.target.value)}
          />
        );
        break;
      case 'number':
        control = (
          <input
            {...commonProps}
            type="number"
            value={
              currentValue === '' || currentValue === undefined || currentValue === null
                ? ''
                : String(currentValue)
            }
            min={field.min}
            max={field.max}
            onChange={(event) => {
              const value = event.target.value;
              handleAnswerChange(field, value === '' ? '' : Number(value));
            }}
          />
        );
        break;
      case 'email':
        control = <input {...commonProps} type="email" value={normalizeString(currentValue)} />;
        break;
      case 'phone':
        control = <input {...commonProps} type="tel" value={normalizeString(currentValue)} />;
        break;
      case 'datetime':
        control = (
          <input
            {...commonProps}
            type="datetime-local"
            value={normalizeString(currentValue)}
          />
        );
        break;
      case 'url':
        control = <input {...commonProps} type="url" value={normalizeString(currentValue)} />;
        break;
      case 'dropdown':
        control = (
          <select
            {...commonProps}
            className={styles.select}
            value={normalizeString(currentValue)}
            onChange={(event) => handleAnswerChange(field, event.target.value)}
          >
            <option value="">Select an option</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
        break;
      case 'file':
        control = (
          <div className={styles.fileInput}>
              <input
                id={inputId}
                name={field.id}
                type="file"
                required={field.required && typeof currentValue !== 'string'}
                disabled={submission.status === 'loading'}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setUploadingField(field.id);
                  try {
                    const url = await uploadFile(file);
                    handleAnswerChange(field, url);
                  } finally {
                    setUploadingField(null);
                  }
                }}
              />
            {uploadingField === field.id && <span className={styles.helper}>Uploading…</span>}
            {typeof currentValue === 'string' && currentValue.length > 0 && (
              <span className={styles.filePreview}>{currentValue}</span>
            )}
          </div>
        );
        break;
      default:
        control = <input {...commonProps} type="text" value={normalizeString(currentValue)} />;
    }

    return (
      <div key={field.id} className={fieldClass}>
        <label htmlFor={inputId} className={styles.labelText}>
          {field.label}
          {requiredMarker}
        </label>
        {control}
        {field.help && (
          <p id={helpId} className={styles.helper}>
            {field.help}
          </p>
        )}
        {error && (
          <div id={errorId} className={styles.fieldError} role="alert">
            {error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" onClick={() => navigate(-1)} className={styles.backLink}>
          ← Back to event
        </button>
        <h1>Register for {eventTitle}</h1>
        <p>Fill in the details below to secure your spot.</p>
      </div>

      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        {(globalError || submission.error || errorSummaryItems.length > 0) && (
          <div className={styles.errorSummary} role="alert" aria-live="assertive">
            <p>{globalError || submission.error || 'Please review the fields below.'}</p>
            {errorSummaryItems.length > 0 && (
              <ul>
                {errorSummaryItems.map((item) => (
                  <li key={item.fieldId}>
                    <button
                      type="button"
                      className={styles.summaryLink}
                      onClick={() => focusField(item.fieldId)}
                    >
                      {item.label}: {item.message}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className={styles.fieldGroup}>{form.fields.map((field) => renderField(field))}</div>

        <section className={styles.paymentCard} aria-labelledby="payment-section">
          <h2 id="payment-section" className={styles.cardTitle}>
            Payment details (optional)
          </h2>
          <label className={styles.checkboxRow} htmlFor="registration-payment-required">
            <input
              id="registration-payment-required"
              type="checkbox"
              checked={payment.enabled}
              onChange={(event) =>
                setPayment((prev) => ({ ...prev, enabled: event.target.checked }))
              }
              disabled={submission.status === 'loading'}
            />
            <span>Include payment information for this registration</span>
          </label>

          {payment.enabled && (
            <div className={styles.paymentFields}>
              <label className={styles.labelText} htmlFor="registration-payment-amount">
                Amount (INR)
              </label>
              <input
                id="registration-payment-amount"
                type="number"
                min="0"
                step="any"
                className={styles.input}
                value={payment.amount}
                onChange={(event) =>
                  setPayment((prev) => ({ ...prev, amount: event.target.value }))
                }
                disabled={submission.status === 'loading'}
              />
              <label className={styles.labelText} htmlFor="registration-payment-proof">
                Payment proof URL
              </label>
              <input
                id="registration-payment-proof"
                type="url"
                className={styles.input}
                value={payment.proofUrl}
                placeholder="https://example.com/your-receipt"
                onChange={(event) =>
                  setPayment((prev) => ({ ...prev, proofUrl: event.target.value }))
                }
                disabled={submission.status === 'loading'}
              />
              <p className={styles.helper}>
                Upload receipts or confirmations to cloud storage and paste the public link here.
              </p>
            </div>
          )}
        </section>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={submission.status === 'loading'}
        >
          {submission.status === 'loading' ? 'Submitting…' : 'Submit registration'}
        </button>
      </form>
    </div>
  );
};

export default RegisterEventPage;
