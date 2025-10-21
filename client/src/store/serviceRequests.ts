import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { http, adminHttp } from '@/lib/http';
import { toErrorMessage, toItems } from '@/lib/response';
import type {
  ActOnServiceOfferPayload,
  CreateServiceRequestPayload,
  PublicServiceRequest,
  ServiceRequest,
  ServiceRequestHistoryEntry,
  ServiceRequestOffer,
  ServiceProviderUser,
  SubmitServiceOfferPayload,
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

interface PublicListState {
  items: PublicServiceRequest[];
  status: RequestStatus;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
}

interface ServiceRequestsState {
  createStatus: RequestStatus;
  createError: string | null;
  mine: ListState;
  admin: ListState;
  publicList: PublicListState;
}

const initialState: ServiceRequestsState = {
  createStatus: 'idle',
  createError: null,
  mine: { items: [], status: 'idle', error: null },
  admin: { items: [], status: 'idle', error: null, total: 0, page: 1, pageSize: 20 },
  publicList: { items: [], status: 'idle', error: null, total: 0, page: 1, pageSize: 20 },
};

const normalizeUserSummary = (entry: any): ServiceProviderUser => ({
  _id: String(entry?._id ?? entry?.id ?? ''),
  name: entry?.name ?? '',
  phone: entry?.phone ?? '',
  location: entry?.location ?? '',
  address: entry?.address ?? '',
});

const normalizeOffer = (data: any): ServiceRequestOffer => ({
  _id: String(data?._id ?? data?.id ?? ''),
  providerId:
    typeof data?.providerId === 'string'
      ? data.providerId
      : data?.providerId?._id
      ? String(data.providerId._id)
      : data?.providerId
      ? String(data.providerId)
      : '',
  provider:
    data?.provider
      ? normalizeUserSummary(data.provider)
      : data?.providerId && typeof data.providerId === 'object' && data.providerId._id
      ? normalizeUserSummary(data.providerId)
      : null,
  note: data?.note ?? '',
  contact: data?.contact ?? '',
  createdAt: data?.createdAt ?? data?.created_at ?? undefined,
  status: (data?.status as ServiceRequestOffer['status']) ?? 'pending',
});

const normalizeHistory = (data: any): ServiceRequestHistoryEntry => ({
  at: (data?.at ?? data?.createdAt ?? null) as string | null,
  by:
    typeof data?.by === 'string'
      ? data.by
      : data?.by?._id
      ? String(data.by._id)
      : data?.by
      ? String(data.by)
      : null,
  type: (data?.type as ServiceRequestHistoryEntry['type']) ?? 'admin_note',
  message: data?.message ?? null,
});

const normalizePublicRequest = (data: any): PublicServiceRequest => ({
  _id: String(data?._id ?? data?.id ?? ''),
  id: String(data?.id ?? data?._id ?? ''),
  serviceId:
    typeof data?.serviceId === 'string'
      ? data.serviceId
      : data?.serviceId?._id
      ? String(data.serviceId._id)
      : data?.serviceId
      ? String(data.serviceId)
      : null,
  title: data?.title ?? '',
  description: data?.description ?? '',
  location: data?.location ?? '',
  createdAt: (data?.createdAt ?? null) as string | null,
  status: (data?.status as ServiceRequest['status']) ?? 'open',
  offersCount:
    typeof data?.offersCount === 'number'
      ? data.offersCount
      : Array.isArray(data?.offers)
      ? data.offers.length
      : 0,
  visibility: data?.visibility === 'private' ? 'private' : 'public',
  requester: data?.requester ?? 'Anonymous',
});

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
  visibility: data.visibility === 'private' ? 'private' : 'public',
  status: (data.status as ServiceRequest['status']) ?? 'open',
  adminNotes: data.adminNotes ?? '',
  reopenedCount: typeof data.reopenedCount === 'number' ? data.reopenedCount : 0,
  assignedProviderId:
    data.assignedProviderId
      ? typeof data.assignedProviderId === 'string'
        ? data.assignedProviderId
        : data.assignedProviderId?._id
        ? String(data.assignedProviderId._id)
        : String(data.assignedProviderId)
      : null,
  assignedProvider:
    data.assignedProvider
      ? normalizeUserSummary(data.assignedProvider)
      : data.assignedProviderId && data.assignedProviderId.name
      ? normalizeUserSummary(data.assignedProviderId)
      : null,
  assignedProviders: Array.isArray(data.assignedProviders)
    ? data.assignedProviders.map((entry: any) => normalizeUserSummary(entry))
    : [],
  assignedProviderIds: Array.isArray(data.assignedProviderIds)
    ? data.assignedProviderIds.map((value: any) => {
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object' && value._id) return String(value._id);
        if (value && typeof value === 'object' && typeof value.toString === 'function')
          return value.toString();
        return String(value ?? '');
      })
    : data.assignedProviderId
    ? [
        typeof data.assignedProviderId === 'string'
          ? data.assignedProviderId
          : data.assignedProviderId?._id
          ? String(data.assignedProviderId._id)
          : String(data.assignedProviderId ?? ''),
      ].filter(Boolean)
    : [],
  offers: Array.isArray(data.offers) ? data.offers.map(normalizeOffer) : [],
  offersCount:
    typeof data.offersCount === 'number'
      ? data.offersCount
      : Array.isArray(data.offers)
      ? data.offers.length
      : 0,
  history: Array.isArray(data.history) ? data.history.map(normalizeHistory) : [],
  isAnonymizedPublic:
    typeof data.isAnonymizedPublic === 'boolean' ? data.isAnonymizedPublic : undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

const applyRequestUpdate = (state: ServiceRequestsState, updated: ServiceRequest) => {
  state.mine.items = state.mine.items.map((item) =>
    item._id === updated._id ? updated : item
  );
  state.admin.items = state.admin.items.map((item) =>
    item._id === updated._id ? updated : item
  );
  state.publicList.items = state.publicList.items.map((item) =>
    item._id === updated._id
      ? {
          ...item,
          title: updated.service?.name || updated.customName || item.title,
          description: updated.description ?? item.description,
          status: updated.status,
          offersCount: updated.offersCount,
        }
      : item
  );
};

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

export const fetchPublicServiceRequests = createAsyncThunk(
  'serviceRequests/fetchPublic',
  async (
    params: { page?: number; pageSize?: number; q?: string; serviceId?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const res = await http.get('/service-requests/public', { params });
      const body = res?.data?.data ?? res?.data ?? {};
      const items = Array.isArray(body.items) ? body.items.map(normalizePublicRequest) : [];
      const page = typeof body.page === 'number' ? body.page : params?.page ?? 1;
      const pageSize =
        typeof body.pageSize === 'number' ? body.pageSize : params?.pageSize ?? items.length;
      const total = typeof body.total === 'number' ? body.total : items.length;
      return { items, page, pageSize, total };
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const submitServiceOffer = createAsyncThunk(
  'serviceRequests/submitOffer',
  async (
    { requestId, payload }: { requestId: string; payload: SubmitServiceOfferPayload },
    { rejectWithValue }
  ) => {
    try {
      const res = await http.post(`/service-requests/${requestId}/offers`, payload);
      const data = res?.data?.data ?? res?.data ?? {};
      const request = data.request ? normalizeRequest(data.request) : null;
      if (!request) throw new Error('Invalid request response');
      return request;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const actOnServiceOffer = createAsyncThunk(
  'serviceRequests/actOnOffer',
  async (
    {
      requestId,
      offerId,
      payload,
    }: { requestId: string; offerId: string; payload: ActOnServiceOfferPayload },
    { rejectWithValue }
  ) => {
    try {
      const res = await http.patch(`/service-requests/${requestId}/offers/${offerId}`, payload);
      const data = res?.data?.data ?? res?.data ?? {};
      const request = data.request ? normalizeRequest(data.request) : null;
      if (!request) throw new Error('Invalid request response');
      return request;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const completeServiceRequest = createAsyncThunk(
  'serviceRequests/complete',
  async (
    { id, message }: { id: string; message?: string },
    { rejectWithValue }
  ) => {
    try {
      const body = message ? { message } : undefined;
      const res = await http.post(`/service-requests/${id}/complete`, body);
      const data = res?.data?.data ?? res?.data ?? {};
      const request = data.request ? normalizeRequest(data.request) : null;
      if (!request) throw new Error('Invalid request response');
      return request;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const reopenServiceRequest = createAsyncThunk(
  'serviceRequests/reopen',
  async (
    { id, message }: { id: string; message?: string },
    { rejectWithValue }
  ) => {
    try {
      const body = message ? { message } : undefined;
      const res = await http.post(`/service-requests/${id}/reopen`, body);
      const data = res?.data?.data ?? res?.data ?? {};
      const request = data.request ? normalizeRequest(data.request) : null;
      if (!request) throw new Error('Invalid request response');
      return request;
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
      .addCase(fetchPublicServiceRequests.pending, (state) => {
        state.publicList.status = 'loading';
        state.publicList.error = null;
      })
      .addCase(fetchPublicServiceRequests.fulfilled, (state, action) => {
        state.publicList.status = 'succeeded';
        state.publicList.items = action.payload.items;
        state.publicList.page = action.payload.page;
        state.publicList.pageSize = action.payload.pageSize;
        state.publicList.total = action.payload.total;
      })
      .addCase(fetchPublicServiceRequests.rejected, (state, action) => {
        state.publicList.status = 'failed';
        state.publicList.error =
          (action.payload as string) || action.error.message || 'Failed to load public requests';
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
      .addCase(submitServiceOffer.fulfilled, (state, action) => {
        applyRequestUpdate(state, action.payload);
      })
      .addCase(actOnServiceOffer.fulfilled, (state, action) => {
        applyRequestUpdate(state, action.payload);
      })
      .addCase(completeServiceRequest.fulfilled, (state, action) => {
        applyRequestUpdate(state, action.payload);
      })
      .addCase(reopenServiceRequest.fulfilled, (state, action) => {
        applyRequestUpdate(state, action.payload);
      })
      .addCase(adminUpdateServiceRequest.fulfilled, (state, action) => {
        applyRequestUpdate(state, action.payload);
      });
  },
});

export default serviceRequestsSlice.reducer;
