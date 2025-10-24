import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
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

const RegisterEventPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const formState = useSelector((state: RootState) => state.registrations.form);
  const submission = useSelector((state: RootState) => state.registrations.submission);
  const eventDetail = useSelector((state: RootState) => state.events.detail.data);

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ required: boolean; amount: string; proofUrl: string }>(
    { required: false, amount: '', proofUrl: '' }
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
    const defaults: Record<string, unknown> = {};
    formState.data.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        defaults[field.id] = field.defaultValue;
      } else if (field.type === 'checkbox') {
        defaults[field.id] = [];
      } else {
        defaults[field.id] = '';
      }
    });
    setAnswers(defaults);
  }, [formState.data]);

  const loading = formState.loading || !formState.data;

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await http.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res?.data?.url || res?.data?.data?.url;
      if (typeof url === 'string' && url.length) {
        return url;
      }
    } catch (err) {
      console.warn('File upload failed, using local URL fallback', err);
    }
    const fallback = URL.createObjectURL(file);
    showToast('Using a temporary local file URL. Replace with a real uploader.', 'info');
    return fallback;
  };

  const handleAnswerChange = (field: Field, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [field.id]: value }));
  };

  const handleCheckboxChange = (field: Field, option: string, checked: boolean) => {
    const existing = Array.isArray(answers[field.id]) ? (answers[field.id] as string[]) : [];
    const next = checked ? [...new Set([...existing, option])] : existing.filter((value) => value !== option);
    handleAnswerChange(field, next);
  };

  const validateFieldValue = (field: Field, value: unknown): string | null => {
    if (value === undefined || value === null || value === '') {
      if (field.required) {
        return 'This field is required';
      }
      if (field.type === 'checkbox') {
        const arr = Array.isArray(value) ? value : [];
        if (field.required && !arr.length) {
          return 'This field is required';
        }
      }
      return null;
    }

    switch (field.type) {
      case 'email': {
        const email = String(value).trim();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Enter a valid email';
      }
      case 'phone': {
        const phone = String(value).replace(/[^0-9+]/g, '');
        return /^\+?\d{10,13}$/.test(phone) ? null : 'Enter a valid phone number';
      }
      case 'number': {
        const num = Number(value);
        if (!Number.isFinite(num)) return 'Enter a valid number';
        if (typeof field.min === 'number' && num < field.min) return `Must be at least ${field.min}`;
        if (typeof field.max === 'number' && num > field.max) return `Must be at most ${field.max}`;
        return null;
      }
      case 'dropdown':
      case 'radio': {
        const option = String(value);
        return field.options?.includes(option) ? null : 'Choose a valid option';
      }
      case 'checkbox': {
        const arr = Array.isArray(value) ? (value as string[]) : [];
        if (field.required && !arr.length) return 'Select at least one option';
        const invalid = arr.some((item) => !field.options?.includes(item));
        return invalid ? 'Select a valid option' : null;
      }
      case 'url':
      case 'file': {
        try {
          const url = new URL(String(value));
          return ['http:', 'https:'].includes(url.protocol) ? null : 'Enter a valid URL';
        } catch (err) {
          return 'Enter a valid URL';
        }
      }
      case 'datetime': {
        const parsed = Date.parse(String(value));
        return Number.isNaN(parsed) ? 'Enter a valid date/time' : null;
      }
      default: {
        const text = String(value);
        if (field.pattern) {
          const regex = new RegExp(field.pattern);
          if (!regex.test(text)) return 'Value does not match the expected format';
        }
        return null;
      }
    }
  };

  const validateForm = (form: EventFormResolved) => {
    const errors: Record<string, string> = {};
    form.fields.forEach((field) => {
      const error = validateFieldValue(field, answers[field.id]);
      if (error) {
        errors[field.id] = error;
      }
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGlobalError(null);
    if (!id || !formState.data) return;
    const isValid = validateForm(formState.data);
    if (!isValid) {
      setGlobalError('Please resolve the highlighted errors.');
      return;
    }
    let paymentPayload: {
      required: boolean;
      amount?: number;
      currency?: 'INR';
      proofUrl?: string;
    } = { required: false };

    if (payment.required) {
      const trimmedAmount = payment.amount.trim();
      const trimmedProof = payment.proofUrl.trim();
      let parsedAmount: number | undefined;

      if (trimmedAmount) {
        const numericValue = Number(trimmedAmount);
        if (!Number.isFinite(numericValue) || numericValue < 0) {
          const message = 'Enter a valid, non-negative payment amount.';
          setGlobalError(message);
          showToast(message, 'error');
          return;
        }
        parsedAmount = numericValue;
      }

      if (trimmedProof) {
        try {
          const url = new URL(trimmedProof);
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('invalid protocol');
          }
        } catch (error) {
          const message = 'Enter a valid payment proof URL.';
          setGlobalError(message);
          showToast(message, 'error');
          return;
        }
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
      showToast('Registration submitted', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit registration';
      setGlobalError(message);
      showToast(message, 'error');
    }
  };

  if (loading) {
    return <div className={styles.page}>Loading registration form…</div>;
  }

  if (formState.error) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h2>Registration unavailable</h2>
          <p>{formState.error}</p>
        </div>
      </div>
    );
  }

  if (!formState.data) {
    return <div className={styles.page}>Registration form is not available.</div>;
  }

  const form = formState.data;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" onClick={() => navigate(-1)} className={styles.helper}>
          ← Back to event
        </button>
        <h1>Register for {eventDetail?.title ?? 'the event'}</h1>
        <p>Fill in the required details to secure your spot.</p>
      </div>

      {submission.status === 'succeeded' ? (
        <div className={styles.successMessage}>
          Registration submitted! Current status: {submission.result?.status ?? 'submitted'}.
        </div>
      ) : (
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          {globalError && <div className={styles.errorMessage}>{globalError}</div>}
          <div className={styles.fieldGroup}>
            {form.fields.map((field) => {
              const value = answers[field.id];
              const error = fieldErrors[field.id];
              return (
                <div key={field.id}>
                  <label className={styles.label}>
                    {field.label}
                    {field.type === 'short_text' && (
                      <input
                        className={styles.input}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => handleAnswerChange(field, event.target.value)}
                        required={field.required}
                        placeholder={field.placeholder}
                      />
                    )}
                    {field.type === 'textarea' && (
                      <textarea
                        className={styles.textarea}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => handleAnswerChange(field, event.target.value)}
                        rows={4}
                        required={field.required}
                        placeholder={field.placeholder}
                      />
                    )}
                    {field.type === 'number' && (
                      <input
                        type="number"
                        className={styles.input}
                        value={value === '' || value === undefined ? '' : Number(value)}
                        onChange={(event) => handleAnswerChange(field, event.target.value === '' ? '' : Number(event.target.value))}
                        required={field.required}
                      />
                    )}
                    {field.type === 'email' && (
                      <input
                        type="email"
                        className={styles.input}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => handleAnswerChange(field, event.target.value)}
                        required={field.required}
                      />
                    )}
                    {field.type === 'phone' && (
                      <input
                        type="tel"
                        className={styles.input}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => handleAnswerChange(field, event.target.value)}
                        required={field.required}
                      />
                    )}
                    {field.type === 'datetime' && (
                      <input
                        type="datetime-local"
                        className={styles.input}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => handleAnswerChange(field, event.target.value)}
                        required={field.required}
                      />
                    )}
                    {field.type === 'url' && (
                      <input
                        type="url"
                        className={styles.input}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => handleAnswerChange(field, event.target.value)}
                        required={field.required}
                      />
                    )}
                    {field.type === 'dropdown' && (
                      <select
                        className={styles.select}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => handleAnswerChange(field, event.target.value)}
                        required={field.required}
                      >
                        <option value="">Select an option</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                    {field.type === 'radio' && (
                      <div className={styles.fieldGroup}>
                        {field.options?.map((option) => (
                          <label key={option} className={styles.checkboxRow}>
                            <input
                              type="radio"
                              name={field.id}
                              checked={value === option}
                              onChange={() => handleAnswerChange(field, option)}
                              required={field.required}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    )}
                    {field.type === 'checkbox' && (
                      <div className={styles.fieldGroup}>
                        {field.options?.map((option) => {
                          const selected = Array.isArray(value) ? (value as string[]).includes(option) : false;
                          return (
                            <label key={option} className={styles.checkboxRow}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(event) => handleCheckboxChange(field, option, event.target.checked)}
                              />
                              {option}
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {field.type === 'file' && (
                      <div className={styles.fileInput}>
                        <input
                          type="file"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            setUploadingField(field.id);
                            const url = await uploadFile(file);
                            setUploadingField(null);
                            handleAnswerChange(field, url);
                          }}
                          required={field.required && typeof value !== 'string'}
                        />
                        {uploadingField === field.id && <span className={styles.helper}>Uploading…</span>}
                        {typeof value === 'string' && value && (
                          <span className={styles.filePreview}>{value}</span>
                        )}
                      </div>
                    )}
                    {field.help && <span className={styles.helper}>{field.help}</span>}
                  </label>
                  {error && <div className={styles.errorMessage}>{error}</div>}
                </div>
              );
            })}
          </div>

          <section className={styles.paymentCard}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={payment.required}
                onChange={(event) => setPayment((prev) => ({ ...prev, required: event.target.checked }))}
              />
              Payment required for this entry
            </label>
            {payment.required && (
              <>
                <label className={styles.label}>
                  Amount (INR)
                  <input
                    type="number"
                    className={styles.input}
                    value={payment.amount}
                    onChange={(event) => setPayment((prev) => ({ ...prev, amount: event.target.value }))}
                  />
                </label>
                <label className={styles.label}>
                  Payment proof URL
                  <input
                    className={styles.input}
                    value={payment.proofUrl}
                    onChange={(event) => setPayment((prev) => ({ ...prev, proofUrl: event.target.value }))}
                    placeholder="https://example.com/payment-proof"
                  />
                </label>
              </>
            )}
          </section>

          <button type="submit" className={styles.submitButton} disabled={submission.status === 'loading'}>
            {submission.status === 'loading' ? 'Submitting…' : 'Submit registration'}
          </button>
        </form>
      )}
    </div>
  );
};

export default RegisterEventPage;
