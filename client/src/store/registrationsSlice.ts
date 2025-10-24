import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { isAxiosError } from 'axios';
import { http } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';
import type { EventFormResolved, Field } from '@/types/forms';

type SubmissionStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface RegistrationResult {
  id: string;
  status: string;
  payment?: {
    required: boolean;
    amount?: number;
    currency?: string;
    proofUrl?: string;
  };
}

interface RegistrationState {
  form: {
    data: EventFormResolved | null;
    loading: boolean;
    error: string | null;
  };
  submission: {
    status: SubmissionStatus;
    error: string | null;
    result: RegistrationResult | null;
  };
}

const initialState: RegistrationState = {
  form: {
    data: null,
    loading: false,
    error: null,
  },
  submission: {
    status: 'idle',
    error: null,
    result: null,
  },
};

const normalizeFieldType = (value: any): Field['type'] => {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  if (normalized === 'long_text') return 'textarea';
  if (normalized === 'text') return 'short_text';
  if (
    normalized === 'phone' ||
    normalized === 'email' ||
    normalized === 'number' ||
    normalized === 'dropdown' ||
    normalized === 'radio' ||
    normalized === 'checkbox' ||
    normalized === 'url' ||
    normalized === 'file' ||
    normalized === 'datetime' ||
    normalized === 'textarea' ||
    normalized === 'short_text'
  ) {
    return normalized as Field['type'];
  }
  return 'short_text';
};

const normalizeField = (field: any): Field => ({
  id: String(field?.id ?? field?.key ?? ''),
  label: String(field?.label ?? field?.title ?? ''),
  type: normalizeFieldType(field?.type),
  required: Boolean(field?.required),
  placeholder: field?.placeholder ?? '',
  help: field?.help ?? field?.description ?? '',
  options: Array.isArray(field?.options) ? field.options.map(String) : undefined,
  min: typeof field?.min === 'number' ? field.min : undefined,
  max: typeof field?.max === 'number' ? field.max : undefined,
  pattern: typeof field?.pattern === 'string' ? field.pattern : undefined,
  defaultValue: field?.defaultValue ?? field?.value ?? undefined,
});

const normalizeRegistrationMeta = (raw: any): EventFormResolved['registration'] => {
  if (!raw || typeof raw !== 'object') {
    return { isOpen: true, message: null, closedReason: null };
  }

  const record = raw as Record<string, any>;
  const reason =
    record.closedReason ??
    record.reason ??
    record.message ??
    record.note ??
    record.details ??
    null;

  const isOpen =
    record.isOpen !== false &&
    record.open !== false &&
    record.status !== 'closed' &&
    record.closed !== true;

  return {
    isOpen,
    message: record.message ?? record.statusMessage ?? reason ?? null,
    closedReason: !isOpen ? reason ?? record.statusMessage ?? null : null,
  };
};

const extractDynamicForm = (raw: any): any => {
  if (!raw || typeof raw !== 'object') return raw;
  if (raw.dynamicForm) return raw.dynamicForm;
  if (raw.form) return raw.form;
  if (raw.data?.dynamicForm) return raw.data.dynamicForm;
  return raw;
};

const normalizeEventForm = (raw: any): EventFormResolved => {
  const dynamicForm = extractDynamicForm(raw) ?? {};
  const registrationMeta =
    raw?.registration ??
    raw?.registrationStatus ??
    raw?.status ??
    raw?.data?.registration ??
    null;

  const fieldsSource = Array.isArray(dynamicForm?.fields)
    ? dynamicForm.fields
    : Array.isArray(raw?.fields)
    ? raw.fields
    : [];

  return {
    mode: dynamicForm?.mode === 'template' ? 'template' : 'embedded',
    templateId: dynamicForm?.templateId ?? raw?.templateId ?? null,
    isActive: dynamicForm?.isActive !== false && raw?.isActive !== false,
    dynamicForm:
      dynamicForm && typeof dynamicForm === 'object'
        ? { isActive: dynamicForm?.isActive !== false }
        : null,
    registration: normalizeRegistrationMeta(registrationMeta),
    title: raw?.title ?? dynamicForm?.title ?? null,
    description: raw?.description ?? dynamicForm?.description ?? null,
    fields: fieldsSource.map(normalizeField),
  };
};

export const fetchEventForm = createAsyncThunk<
  EventFormResolved,
  string,
  { rejectValue: string }
>('registrations/fetchEventForm', async (eventId, { rejectWithValue }) => {
  try {
    const res = await http.get(`/events/${eventId}/form`);
    return normalizeEventForm(res?.data?.data ?? res?.data);
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

interface SubmitPayload {
  eventId: string;
  data: Record<string, unknown>;
  payment?: {
    required?: boolean;
    amount?: number;
    currency?: string;
    proofUrl?: string;
  };
}

export const submitRegistration = createAsyncThunk<
  RegistrationResult,
  SubmitPayload,
  { rejectValue: string }
>('registrations/submit', async ({ eventId, data, payment }, { rejectWithValue }) => {
  try {
    const body: Record<string, unknown> = { data };
    if (payment && Object.keys(payment).length > 0) {
      body.payment = payment;
    }

    const res = await http.post(`/events/${eventId}/register`, body);
    const payload = res?.data?.data ?? res?.data;
    return {
      id: String(payload?.id ?? payload?._id ?? ''),
      status: String(payload?.status ?? payload?.data?.status ?? 'submitted'),
      payment: payload?.payment,
    };
  } catch (err) {
    const fallback = toErrorMessage(err);
    if (isAxiosError(err)) {
      const status = err.response?.status;
      const errorCode =
        err.response?.data?.code ||
        err.response?.data?.error?.code ||
        err.response?.data?.error?.name ||
        err.response?.data?.error?.type;
      const normalizedMessage = fallback.toLowerCase();

      if (status === 409 || errorCode === 'already_registered') {
        return rejectWithValue('It looks like you are already registered for this event.');
      }

      if (status === 410 || errorCode === 'registration_closed') {
        return rejectWithValue('Registrations for this event are closed at the moment.');
      }

      if (status === 403 || status === 422 || errorCode === 'capacity_full') {
        return rejectWithValue('This event has reached its registration capacity.');
      }

      if (status === 429 || errorCode === 'rate_limited' || normalizedMessage.includes('too many')) {
        return rejectWithValue('You are submitting registrations too quickly. Please wait and try again.');
      }

      if (normalizedMessage.includes('duplicate')) {
        return rejectWithValue('It looks like you are already registered for this event.');
      }

      if (normalizedMessage.includes('capacity') || normalizedMessage.includes('full')) {
        return rejectWithValue('This event has reached its registration capacity.');
      }
    }

    return rejectWithValue(fallback);
  }
});

const registrationsSlice = createSlice({
  name: 'registrations',
  initialState,
  reducers: {
    resetSubmission(state) {
      state.submission = { status: 'idle', error: null, result: null };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEventForm.pending, (state) => {
        state.form.loading = true;
        state.form.error = null;
      })
      .addCase(fetchEventForm.fulfilled, (state, action: PayloadAction<EventFormResolved>) => {
        state.form.loading = false;
        state.form.data = action.payload;
      })
      .addCase(fetchEventForm.rejected, (state, action) => {
        state.form.loading = false;
        state.form.error = action.payload ?? 'Unable to load registration form';
      })
      .addCase(submitRegistration.pending, (state) => {
        state.submission.status = 'loading';
        state.submission.error = null;
      })
      .addCase(submitRegistration.fulfilled, (state, action: PayloadAction<RegistrationResult>) => {
        state.submission.status = 'succeeded';
        state.submission.result = action.payload;
      })
      .addCase(submitRegistration.rejected, (state, action) => {
        state.submission.status = 'failed';
        state.submission.error = action.payload ?? 'Registration failed';
      });
  },
});

export const { resetSubmission } = registrationsSlice.actions;
export default registrationsSlice.reducer;
