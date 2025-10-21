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

interface ServicesState {
  items: Service[];
  status: RequestStatus;
  error: string | null;
  providers: Record<string, ProvidersEntry>;
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
  createdBy: data.createdBy ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
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
  notes: data.notes ?? '',
  bio: data.bio ?? '',
  profession: data.profession ?? '',
  source: data.source ?? undefined,
});

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
      .addCase(fetchServiceProviders.pending, (state, action) => {
        const serviceId = action.meta.arg;
        state.providers[serviceId] = {
          service: state.providers[serviceId]?.service ?? null,
          items: [],
          fallback: [],
          status: 'loading',
          error: null,
        };
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
        state.items = state.items.map((item) =>
          item._id === updated._id ? updated : item
        );
        Object.keys(state.providers).forEach((serviceId) => {
          const entry = state.providers[serviceId];
          if (entry?.service && entry.service._id === updated._id) {
            entry.service = updated;
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
