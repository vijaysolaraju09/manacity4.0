import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
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

const normalizeField = (field: any): Field => ({
  id: String(field?.id ?? ''),
  label: String(field?.label ?? ''),
  type: field?.type ?? 'short_text',
  required: Boolean(field?.required),
  placeholder: field?.placeholder ?? '',
  help: field?.help ?? '',
  options: Array.isArray(field?.options) ? field.options.map(String) : undefined,
  min: typeof field?.min === 'number' ? field.min : undefined,
  max: typeof field?.max === 'number' ? field.max : undefined,
  pattern: typeof field?.pattern === 'string' ? field.pattern : undefined,
  defaultValue: field?.defaultValue ?? undefined,
});

const normalizeEventForm = (raw: any): EventFormResolved => ({
  mode: raw?.mode === 'template' ? 'template' : 'embedded',
  templateId: raw?.templateId ?? null,
  isActive: raw?.isActive !== false,
  fields: Array.isArray(raw?.fields) ? raw.fields.map(normalizeField) : [],
});

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
    const res = await http.post(`/events/${eventId}/register`, { data, payment });
    const payload = res?.data?.data ?? res?.data;
    return {
      id: String(payload?.id ?? payload?._id ?? ''),
      status: String(payload?.status ?? payload?.data?.status ?? 'submitted'),
      payment: payload?.payment,
    };
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
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
