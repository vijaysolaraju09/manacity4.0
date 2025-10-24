import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { adminHttp } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';
import type { EventFormResolved, Field, FormTemplate, FormTemplateCategory } from '@/types/forms';

interface TemplatesState {
  items: FormTemplate[];
  loading: boolean;
  error: string | null;
}

interface EntityState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ActionsState {
  saveTemplate: 'idle' | 'loading' | 'succeeded' | 'failed';
  deleteTemplate: 'idle' | 'loading' | 'succeeded' | 'failed';
  attach: 'idle' | 'loading' | 'succeeded' | 'failed';
  toggle: 'idle' | 'loading' | 'succeeded' | 'failed';
}

interface FormsState {
  templates: TemplatesState;
  currentTemplate: EntityState<FormTemplate>;
  eventForm: EntityState<EventFormResolved>;
  actions: ActionsState;
}

const initialState: FormsState = {
  templates: { items: [], loading: false, error: null },
  currentTemplate: { data: null, loading: false, error: null },
  eventForm: { data: null, loading: false, error: null },
  actions: {
    saveTemplate: 'idle',
    deleteTemplate: 'idle',
    attach: 'idle',
    toggle: 'idle',
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

const normalizeTemplate = (raw: any): FormTemplate => ({
  id: String(raw?.id ?? raw?._id ?? ''),
  name: String(raw?.name ?? ''),
  category: (raw?.category ?? 'other') as FormTemplateCategory,
  fields: Array.isArray(raw?.fields) ? raw.fields.map(normalizeField) : [],
  createdAt: raw?.createdAt,
  updatedAt: raw?.updatedAt,
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

export const listTemplates = createAsyncThunk<
  FormTemplate[],
  { category?: FormTemplateCategory } | undefined,
  { rejectValue: string }
>('forms/listTemplates', async (params, { rejectWithValue }) => {
  try {
    const res = await adminHttp.get('/form-templates', { params });
    const items = Array.isArray(res?.data?.data) ? res.data.data : [];
    return items.map(normalizeTemplate);
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const getTemplate = createAsyncThunk<
  FormTemplate,
  string,
  { rejectValue: string }
>('forms/getTemplate', async (id, { rejectWithValue }) => {
  try {
    const res = await adminHttp.get(`/form-templates/${id}`);
    return normalizeTemplate(res?.data?.data ?? res?.data);
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const createTemplate = createAsyncThunk<
  FormTemplate,
  { name: string; category: FormTemplateCategory; fields: Field[] },
  { rejectValue: string }
>('forms/createTemplate', async (payload, { rejectWithValue }) => {
  try {
    const res = await adminHttp.post('/form-templates', payload);
    return normalizeTemplate(res?.data?.data ?? res?.data);
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const updateTemplate = createAsyncThunk<
  FormTemplate,
  { id: string; changes: Partial<Pick<FormTemplate, 'name' | 'category' | 'fields'>> },
  { rejectValue: string }
>('forms/updateTemplate', async ({ id, changes }, { rejectWithValue }) => {
  try {
    const res = await adminHttp.put(`/form-templates/${id}`, changes);
    return normalizeTemplate(res?.data?.data ?? res?.data);
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const deleteTemplate = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('forms/deleteTemplate', async (id, { rejectWithValue }) => {
  try {
    await adminHttp.delete(`/form-templates/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const attachTemplateToEvent = createAsyncThunk<
  EventFormResolved,
  { eventId: string; templateId: string },
  { rejectValue: string }
>('forms/attachTemplateToEvent', async ({ eventId, templateId }, { rejectWithValue }) => {
  try {
    const res = await adminHttp.put(`/events/${eventId}/form/attach`, { templateId });
    return normalizeEventForm(res?.data?.data?.dynamicForm ?? res?.data?.data ?? res?.data);
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const setEmbeddedForm = createAsyncThunk<
  EventFormResolved,
  { eventId: string; fields: Field[] },
  { rejectValue: string }
>('forms/setEmbeddedForm', async ({ eventId, fields }, { rejectWithValue }) => {
  try {
    const res = await adminHttp.put(`/events/${eventId}/form/embed`, { fields });
    return normalizeEventForm(res?.data?.data?.dynamicForm ?? res?.data?.data ?? res?.data);
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const toggleFormActive = createAsyncThunk<
  EventFormResolved,
  { eventId: string; isActive: boolean },
  { rejectValue: string }
>('forms/toggleFormActive', async ({ eventId, isActive }, { rejectWithValue }) => {
  try {
    const res = await adminHttp.put(`/events/${eventId}/form/toggle`, { isActive });
    return normalizeEventForm(res?.data?.data?.dynamicForm ?? res?.data?.data ?? res?.data);
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const getEventForm = createAsyncThunk<
  EventFormResolved,
  string,
  { rejectValue: string }
>('forms/getEventForm', async (eventId, { rejectWithValue }) => {
  try {
    const res = await adminHttp.get(`/events/${eventId}/form/preview`);
    return normalizeEventForm(res?.data?.data ?? res?.data);
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

const formsSlice = createSlice({
  name: 'forms',
  initialState,
  reducers: {
    clearCurrentTemplate(state) {
      state.currentTemplate = { data: null, loading: false, error: null };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(listTemplates.pending, (state) => {
        state.templates.loading = true;
        state.templates.error = null;
      })
      .addCase(listTemplates.fulfilled, (state, action: PayloadAction<FormTemplate[]>) => {
        state.templates.loading = false;
        state.templates.items = action.payload;
      })
      .addCase(listTemplates.rejected, (state, action) => {
        state.templates.loading = false;
        state.templates.error = action.payload ?? 'Failed to load templates';
      })
      .addCase(getTemplate.pending, (state) => {
        state.currentTemplate.loading = true;
        state.currentTemplate.error = null;
      })
      .addCase(getTemplate.fulfilled, (state, action: PayloadAction<FormTemplate>) => {
        state.currentTemplate.loading = false;
        state.currentTemplate.data = action.payload;
      })
      .addCase(getTemplate.rejected, (state, action) => {
        state.currentTemplate.loading = false;
        state.currentTemplate.error = action.payload ?? 'Failed to load template';
      })
      .addCase(createTemplate.pending, (state) => {
        state.actions.saveTemplate = 'loading';
      })
      .addCase(createTemplate.fulfilled, (state, action: PayloadAction<FormTemplate>) => {
        state.actions.saveTemplate = 'succeeded';
        state.templates.items.push(action.payload);
        state.currentTemplate = { data: action.payload, loading: false, error: null };
      })
      .addCase(createTemplate.rejected, (state, action) => {
        state.actions.saveTemplate = 'failed';
        state.currentTemplate.error = action.payload ?? 'Failed to create template';
      })
      .addCase(updateTemplate.pending, (state) => {
        state.actions.saveTemplate = 'loading';
      })
      .addCase(updateTemplate.fulfilled, (state, action: PayloadAction<FormTemplate>) => {
        state.actions.saveTemplate = 'succeeded';
        state.templates.items = state.templates.items.map((tpl) =>
          tpl.id === action.payload.id ? action.payload : tpl,
        );
        state.currentTemplate = { data: action.payload, loading: false, error: null };
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.actions.saveTemplate = 'failed';
        state.currentTemplate.error = action.payload ?? 'Failed to update template';
      })
      .addCase(deleteTemplate.pending, (state) => {
        state.actions.deleteTemplate = 'loading';
      })
      .addCase(deleteTemplate.fulfilled, (state, action: PayloadAction<string>) => {
        state.actions.deleteTemplate = 'succeeded';
        state.templates.items = state.templates.items.filter((tpl) => tpl.id !== action.payload);
        if (state.currentTemplate.data?.id === action.payload) {
          state.currentTemplate = { data: null, loading: false, error: null };
        }
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        state.actions.deleteTemplate = 'failed';
        state.templates.error = action.payload ?? 'Failed to delete template';
      })
      .addCase(attachTemplateToEvent.pending, (state) => {
        state.actions.attach = 'loading';
      })
      .addCase(attachTemplateToEvent.fulfilled, (state, action: PayloadAction<EventFormResolved>) => {
        state.actions.attach = 'succeeded';
        state.eventForm = { data: action.payload, loading: false, error: null };
      })
      .addCase(attachTemplateToEvent.rejected, (state, action) => {
        state.actions.attach = 'failed';
        state.eventForm.error = action.payload ?? 'Failed to attach form template';
      })
      .addCase(setEmbeddedForm.pending, (state) => {
        state.actions.saveTemplate = 'loading';
      })
      .addCase(setEmbeddedForm.fulfilled, (state, action: PayloadAction<EventFormResolved>) => {
        state.actions.saveTemplate = 'succeeded';
        state.eventForm = { data: action.payload, loading: false, error: null };
      })
      .addCase(setEmbeddedForm.rejected, (state, action) => {
        state.actions.saveTemplate = 'failed';
        state.eventForm.error = action.payload ?? 'Failed to save embedded form';
      })
      .addCase(toggleFormActive.pending, (state) => {
        state.actions.toggle = 'loading';
      })
      .addCase(toggleFormActive.fulfilled, (state, action: PayloadAction<EventFormResolved>) => {
        state.actions.toggle = 'succeeded';
        state.eventForm = { data: action.payload, loading: false, error: null };
      })
      .addCase(toggleFormActive.rejected, (state, action) => {
        state.actions.toggle = 'failed';
        state.eventForm.error = action.payload ?? 'Failed to update form status';
      })
      .addCase(getEventForm.pending, (state) => {
        state.eventForm.loading = true;
        state.eventForm.error = null;
      })
      .addCase(getEventForm.fulfilled, (state, action: PayloadAction<EventFormResolved>) => {
        state.eventForm.loading = false;
        state.eventForm.data = action.payload;
      })
      .addCase(getEventForm.rejected, (state, action) => {
        state.eventForm.loading = false;
        state.eventForm.error = action.payload ?? 'Failed to load event form';
      });
  },
});

export const { clearCurrentTemplate } = formsSlice.actions;
export default formsSlice.reducer;
