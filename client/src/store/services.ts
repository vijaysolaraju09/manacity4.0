import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { http, adminHttp } from '@/lib/http';
import { toErrorMessage, toItems } from '@/lib/response';
import type {
  Service,
  ServiceProvider,
  UpsertServicePayload,
} from '@/types/services';

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface ProvidersEntry {
  service: Service | null;
  items: ServiceProvider[];
  fallback: ServiceProvider[];
  status: RequestStatus;
  error: string | null;
}

interface ServiceDetailState {
  serviceId: string | null;
  currentService: Service | null;
  providers: ServiceProvider[];
  loading: boolean;
  error: string | null;
}

interface ServicesState {
  items: Service[];
  status: RequestStatus;
  error: string | null;
  providers: Record<string, ProvidersEntry>;
  detail: ServiceDetailState;
  createStatus: RequestStatus;
  createError: string | null;
  updateStatus: RequestStatus;
  updateError: string | null;
}

const initialState: ServicesState = {
  items: [],
  status: 'idle',
  error: null,
  providers: {},
  detail: {
    serviceId: null,
    currentService: null,
    providers: [],
    loading: false,
    error: null,
  },
  createStatus: 'idle',
  createError: null,
  updateStatus: 'idle',
  updateError: null,
};

const normalizeService = (data: any): Service => ({
  _id: String(data._id ?? data.id ?? ''),
  id: String(data.id ?? data._id ?? ''),
  name: data.name ?? '',
  description: data.description ?? '',
  icon: data.icon ?? '',
  isActive: data.isActive !== false,
  providers: Array.isArray(data.providers)
    ? data.providers.map((value: any) => String(value)).filter(Boolean)
    : undefined,
  createdBy: data.createdBy ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  title: data.title ?? undefined,
  images: Array.isArray(data.images)
    ? data.images.map((image: unknown) => String(image))
    : undefined,
});

const normalizeProvider = (data: any): ServiceProvider => ({
  id: String(data.id ?? data._id ?? ''),
  mapId: data.mapId ? String(data.mapId) : undefined,
  serviceId: data.serviceId ? String(data.serviceId) : undefined,
  user: data.user
    ? {
        _id: String(data.user._id ?? data.user.id ?? ''),
        name: data.user.name ?? '',
        phone: data.user.phone ?? '',
        location: data.user.location ?? '',
        address: data.user.address ?? '',
        avatarUrl: data.user.avatarUrl ?? '',
        profession: data.user.profession ?? '',
        bio: data.user.bio ?? '',
      }
    : null,
  ratingAvg:
    typeof data.ratingAvg === 'number'
      ? data.ratingAvg
      : typeof data.rating === 'number'
      ? data.rating
      : undefined,
  ratingCount:
    typeof data.ratingCount === 'number'
      ? data.ratingCount
      : typeof data.rating_count === 'number'
      ? data.rating_count
      : undefined,
  completedCount:
    typeof data.completedCount === 'number'
      ? data.completedCount
      : typeof data.completed === 'number'
      ? data.completed
      : undefined,
  notes: data.notes ?? '',
  bio: data.bio ?? '',
  profession: data.profession ?? '',
  source: data.source ?? undefined,
});

interface CreateServiceRequestInput {
  serviceId: string;
  providerId?: string;
  notes?: string;
}

export const fetchServiceById = createAsyncThunk(
  'services/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await http.get(`/services/${id}`);
      const data = res?.data?.data ?? res?.data ?? {};
      const serviceRaw = data.service ?? data;
      const service = normalizeService(serviceRaw);
      return service;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchServices = createAsyncThunk(
  'services/fetchAll',
  async (params: Record<string, unknown> | undefined, { rejectWithValue }) => {
    try {
      const res = await http.get('/services', { params });
      const items = (toItems(res) as any[]).map(normalizeService);
      return items as Service[];
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchServiceProviders = createAsyncThunk(
  'services/fetchProviders',
  async (serviceId: string, { rejectWithValue }) => {
    try {
      const res = await http.get(`/services/${serviceId}/providers`);
      const data = (res?.data?.data ?? res?.data ?? {}) as any;
      const providers = Array.isArray(data.providers)
        ? (data.providers as any[]).map(normalizeProvider)
        : [];
      const fallbackProviders = Array.isArray(data.fallbackProviders)
        ? (data.fallbackProviders as any[]).map(normalizeProvider)
        : [];
      const service = data.service ? normalizeService(data.service) : null;
      return { serviceId, service, providers, fallbackProviders };
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const createService = createAsyncThunk(
  'services/create',
  async (payload: UpsertServicePayload, { rejectWithValue }) => {
    try {
      const res = await adminHttp.post('/admin/services', payload);
      const data = res?.data?.data ?? res?.data ?? {};
      const service = data.service ? normalizeService(data.service) : null;
      if (!service) throw new Error('Invalid service response');
      return service;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const updateService = createAsyncThunk(
  'services/update',
  async (
    { id, payload }: { id: string; payload: UpsertServicePayload },
    { rejectWithValue }
  ) => {
    try {
      const res = await adminHttp.patch(`/admin/services/${id}`, payload);
      const data = res?.data?.data ?? res?.data ?? {};
      const service = data.service ? normalizeService(data.service) : null;
      if (!service) throw new Error('Invalid service response');
      return service;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const createServiceRequest = createAsyncThunk(
  'services/createRequest',
  async (payload: CreateServiceRequestInput, { rejectWithValue }) => {
    try {
      await http.post('/requests', payload);
      return true;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

const servicesSlice = createSlice({
  name: 'services',
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchServices.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message || 'Failed to load services';
      })
      .addCase(fetchServiceById.pending, (state, action) => {
        state.detail.serviceId = action.meta.arg as string;
        state.detail.loading = true;
        state.detail.error = null;
      })
      .addCase(fetchServiceById.fulfilled, (state, action) => {
        state.detail.loading = false;
        if ((state.detail.serviceId ?? action.meta.arg) === action.payload._id) {
          state.detail.error = null;
          state.detail.serviceId = action.payload._id;
          state.detail.currentService = action.payload;
        }
        const index = state.items.findIndex((item) => item._id === action.payload._id);
        if (index >= 0) state.items[index] = action.payload;
        else state.items.push(action.payload);
      })
      .addCase(fetchServiceById.rejected, (state, action) => {
        state.detail.loading = false;
        if (state.detail.serviceId === (action.meta.arg as string)) {
          state.detail.error = (action.payload as string) || action.error.message || 'Failed to load service';
        }
      })
      .addCase(fetchServiceProviders.pending, (state, action) => {
        const serviceId = action.meta.arg;
        state.providers[serviceId] = {
          service: state.providers[serviceId]?.service ?? null,
          items: [],
          fallback: [],
          status: 'loading',
          error: null,
        };
        state.detail.serviceId = serviceId;
        if (!state.detail.currentService || state.detail.currentService._id !== serviceId) {
          state.detail.currentService = state.providers[serviceId]?.service ?? null;
        }
        state.detail.providers = [];
        state.detail.loading = true;
        state.detail.error = null;
      })
      .addCase(fetchServiceProviders.fulfilled, (state, action) => {
        const { serviceId, service, providers, fallbackProviders } = action.payload;
        state.providers[serviceId] = {
          service: service ?? state.providers[serviceId]?.service ?? null,
          items: providers,
          fallback: fallbackProviders,
          status: 'succeeded',
          error: null,
        };
        if (service) {
          const index = state.items.findIndex((item) => item._id === service._id);
          if (index >= 0) state.items[index] = service;
          else state.items.push(service);
        }
        if (state.detail.serviceId === serviceId) {
          if (service) {
            state.detail.currentService = service;
          } else if (!state.detail.currentService && state.providers[serviceId]?.service) {
            state.detail.currentService = state.providers[serviceId]?.service ?? null;
          }
          state.detail.providers = providers;
          state.detail.loading = false;
          state.detail.error = null;
        }
      })
      .addCase(fetchServiceProviders.rejected, (state, action) => {
        const serviceId = action.meta.arg;
        state.providers[serviceId] = {
          service: state.providers[serviceId]?.service ?? null,
          items: [],
          fallback: [],
          status: 'failed',
          error: (action.payload as string) || action.error.message || 'Failed to load providers',
        };
        if (state.detail.serviceId === serviceId) {
          state.detail.providers = [];
          state.detail.error =
            (action.payload as string) || action.error.message || 'Failed to load providers';
          state.detail.loading = false;
        }
      })
      .addCase(createService.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(createService.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.createError = null;
        const service = action.payload;
        const exists = state.items.find((item) => item._id === service._id);
        if (!exists) state.items.push(service);
      })
      .addCase(createService.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = (action.payload as string) || action.error.message || 'Failed to create service';
      })
      .addCase(updateService.pending, (state) => {
        state.updateStatus = 'loading';
        state.updateError = null;
      })
      .addCase(updateService.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const updated = action.payload;
        state.items = state.items.map((item) => {
          if (item._id !== updated._id) return item;
          return {
            ...item,
            ...updated,
            isActive: updated.isActive ?? item.isActive,
          };
        });
        Object.keys(state.providers).forEach((serviceId) => {
          const entry = state.providers[serviceId];
          if (entry?.service && entry.service._id === updated._id) {
            entry.service = {
              ...entry.service,
              ...updated,
              isActive: updated.isActive ?? entry.service.isActive,
            };
          }
        });
      })
      .addCase(updateService.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.updateError = (action.payload as string) || action.error.message || 'Failed to update service';
      });
  },
});

export default servicesSlice.reducer;
