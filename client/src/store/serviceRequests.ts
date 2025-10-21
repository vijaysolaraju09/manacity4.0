import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { http, adminHttp } from '@/lib/http';
import { toErrorMessage, toItems } from '@/lib/response';
import type {
  CreateServiceRequestPayload,
  ServiceRequest,
  UpdateServiceRequestPayload,
} from '@/types/services';

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface ListState {
  items: ServiceRequest[];
  status: RequestStatus;
  error: string | null;
  total?: number;
  page?: number;
  pageSize?: number;
}

interface ServiceRequestsState {
  createStatus: RequestStatus;
  createError: string | null;
  mine: ListState;
  admin: ListState;
}

const initialState: ServiceRequestsState = {
  createStatus: 'idle',
  createError: null,
  mine: { items: [], status: 'idle', error: null },
  admin: { items: [], status: 'idle', error: null, total: 0, page: 1, pageSize: 20 },
};

const normalizeRequest = (data: any): ServiceRequest => ({
  _id: String(data._id ?? data.id ?? ''),
  id: String(data.id ?? data._id ?? ''),
  userId: String(data.userId ?? data.user_id ?? ''),
  serviceId:
    typeof data.serviceId === 'string' || data.serviceId === null
      ? data.serviceId
      : data.serviceId?._id
      ? String(data.serviceId._id)
      : data.serviceId
      ? String(data.serviceId)
      : null,
  service: data.service
    ? {
        _id: String(data.service._id ?? data.service.id ?? ''),
        id: String(data.service.id ?? data.service._id ?? ''),
        name: data.service.name ?? '',
        description: data.service.description ?? '',
        icon: data.service.icon ?? '',
      }
    : data.serviceId && data.serviceId.name
    ? {
        _id: String(data.serviceId._id ?? data.serviceId.id ?? ''),
        id: String(data.serviceId.id ?? data.serviceId._id ?? ''),
        name: data.serviceId.name ?? '',
        description: data.serviceId.description ?? '',
        icon: data.serviceId.icon ?? '',
      }
    : null,
  customName: data.customName ?? '',
  description: data.description ?? '',
  location: data.location ?? '',
  phone: data.phone ?? '',
  preferredDate: data.preferredDate ?? '',
  preferredTime: data.preferredTime ?? '',
  status: (data.status as ServiceRequest['status']) ?? 'open',
  adminNotes: data.adminNotes ?? '',
  assignedProviders: Array.isArray(data.assignedProviders)
    ? data.assignedProviders.map((entry: any) => ({
        _id: String(entry._id ?? entry.id ?? ''),
        name: entry.name ?? '',
        phone: entry.phone ?? '',
        location: entry.location ?? '',
        address: entry.address ?? '',
      }))
    : [],
  assignedProviderIds: Array.isArray(data.assignedProviderIds)
    ? data.assignedProviderIds.map((value: any) => {
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object' && value._id) return String(value._id);
        if (value && typeof value === 'object' && typeof value.toString === 'function')
          return value.toString();
        return String(value ?? '');
      })
    : [],
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const createServiceRequest = createAsyncThunk(
  'serviceRequests/create',
  async (payload: CreateServiceRequestPayload, { rejectWithValue }) => {
    try {
      const res = await http.post('/service-requests', payload);
      const data = res?.data?.data ?? res?.data ?? {};
      const request = data.request ? normalizeRequest(data.request) : null;
      if (!request) throw new Error('Invalid request response');
      return request;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchMyServiceRequests = createAsyncThunk(
  'serviceRequests/fetchMine',
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await http.get('/service-requests/mine');
      const items = (toItems(res) as any[]).map(normalizeRequest);
      return items as ServiceRequest[];
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const adminFetchServiceRequests = createAsyncThunk(
  'serviceRequests/adminFetch',
  async (params: Record<string, unknown> | undefined, { rejectWithValue }) => {
    try {
      const res = await adminHttp.get('/admin/service-requests', { params });
      const body = res?.data?.data ?? res?.data ?? {};
      const items = Array.isArray(body.items) ? body.items.map(normalizeRequest) : [];
      const total = typeof body.total === 'number' ? body.total : items.length;
      const page = typeof body.page === 'number' ? body.page : params?.page ?? 1;
      const pageSize = typeof body.pageSize === 'number' ? body.pageSize : params?.pageSize ?? items.length;
      return { items, total, page, pageSize };
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const adminUpdateServiceRequest = createAsyncThunk(
  'serviceRequests/adminUpdate',
  async (
    { id, payload }: { id: string; payload: UpdateServiceRequestPayload },
    { rejectWithValue }
  ) => {
    try {
      const res = await adminHttp.patch(`/admin/service-requests/${id}`, payload);
      const data = res?.data?.data ?? res?.data ?? {};
      const request = data.request ? normalizeRequest(data.request) : null;
      if (!request) throw new Error('Invalid request response');
      return request;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

const serviceRequestsSlice = createSlice({
  name: 'serviceRequests',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createServiceRequest.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(createServiceRequest.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.createError = null;
        state.mine.items = [action.payload, ...state.mine.items];
      })
      .addCase(createServiceRequest.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = (action.payload as string) || action.error.message || 'Failed to submit request';
      })
      .addCase(fetchMyServiceRequests.pending, (state) => {
        state.mine.status = 'loading';
        state.mine.error = null;
      })
      .addCase(fetchMyServiceRequests.fulfilled, (state, action) => {
        state.mine.status = 'succeeded';
        state.mine.items = action.payload;
      })
      .addCase(fetchMyServiceRequests.rejected, (state, action) => {
        state.mine.status = 'failed';
        state.mine.error = (action.payload as string) || action.error.message || 'Failed to load requests';
      })
      .addCase(adminFetchServiceRequests.pending, (state) => {
        state.admin.status = 'loading';
        state.admin.error = null;
      })
      .addCase(adminFetchServiceRequests.fulfilled, (state, action) => {
        state.admin.status = 'succeeded';
        state.admin.items = action.payload.items;
        state.admin.total = action.payload.total;
        state.admin.page = action.payload.page;
        state.admin.pageSize = action.payload.pageSize;
      })
      .addCase(adminFetchServiceRequests.rejected, (state, action) => {
        state.admin.status = 'failed';
        state.admin.error = (action.payload as string) || action.error.message || 'Failed to load service requests';
      })
      .addCase(adminUpdateServiceRequest.fulfilled, (state, action) => {
        const updated = action.payload;
        state.admin.items = state.admin.items.map((item) =>
          item._id === updated._id ? updated : item
        );
        state.mine.items = state.mine.items.map((item) =>
          item._id === updated._id ? updated : item
        );
      });
  },
});

export default serviceRequestsSlice.reducer;
