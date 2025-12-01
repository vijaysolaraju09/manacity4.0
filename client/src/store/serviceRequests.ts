import { createAsyncThunk, createSlice, type Draft, type PayloadAction } from '@reduxjs/toolkit';
import { http, adminHttp } from '@/lib/http';
import { toErrorMessage, toItems } from '@/lib/response';
import type {
  ActOnServiceOfferPayload,
  CreateServiceRequestPayload,
  PublicServiceRequest,
  ServiceRequest,
  ServiceRequestFeedback,
  ServiceRequestHistoryEntry,
  ServiceRequestOffer,
  ServiceProviderUser,
  ServiceRequestStatus,
  SubmitServiceOfferPayload,
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

interface DetailState {
  item: ServiceRequest | null;
  status: RequestStatus;
  error: string | null;
  currentId: string | null;
}

interface ProvidersState {
  items: ServiceProviderUser[];
  status: RequestStatus;
  error: string | null;
}

export interface ServiceRequestsState {
  createStatus: RequestStatus;
  createError: string | null;
  mine: ListState;
  assigned: ListState;
  admin: ListState;
  publicList: PublicListState;
  detail: DetailState;
  providers: ProvidersState;
}

const initialState: ServiceRequestsState = {
  createStatus: 'idle',
  createError: null,
  mine: { items: [], status: 'idle', error: null },
  assigned: { items: [], status: 'idle', error: null },
  admin: { items: [], status: 'idle', error: null, total: 0, page: 1, pageSize: 20 },
  publicList: { items: [], status: 'idle', error: null, total: 0, page: 1, pageSize: 20 },
  detail: { item: null, status: 'idle', error: null, currentId: null },
  providers: { items: [], status: 'idle', error: null },
};

const normalizeUserSummary = (entry: any): ServiceProviderUser => ({
  _id: String(entry?._id ?? entry?.id ?? ''),
  name: entry?.name ?? '',
  phone: entry?.phone ?? '',
  location: entry?.location ?? '',
  address: entry?.address ?? '',
});

const normalizeStatusValue = (value: any): ServiceRequest['status'] => {
  if (!value) return 'pending';
  const raw = String(value).trim();
  if (!raw) return 'pending';
  const map: Record<string, ServiceRequest['status']> = {
    pending: 'pending',
    awaitingapproval: 'awaiting_approval',
    awaiting_approval: 'awaiting_approval',
    accepted: 'accepted',
    inprogress: 'in_progress',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    rejected: 'rejected',
  };
  const normalized = raw.replace(/\s+/g, '').toLowerCase();
  return map[normalized] ?? 'pending';
};

const normalizeOffer = (data: any): ServiceRequestOffer => {
  const statusRaw = typeof data?.status === 'string' ? data.status.toLowerCase() : '';
  const statusMap: Record<string, ServiceRequestOffer['status']> = {
    pending: 'pending',
    acceptedbyseeker: 'accepted_by_seeker',
    accepted_by_seeker: 'accepted_by_seeker',
    rejectedbyseeker: 'rejected_by_seeker',
    rejected_by_seeker: 'rejected_by_seeker',
  };

  const helper =
    data?.helper || data?.helperId?.name
      ? normalizeUserSummary(data.helper || data.helperId)
      : data?.provider
      ? normalizeUserSummary(data.provider)
      : data?.providerId && typeof data.providerId === 'object' && data.providerId._id
      ? normalizeUserSummary(data.providerId)
      : null;

  return {
    _id: String(data?._id ?? data?.id ?? ''),
    providerId:
      typeof data?.helperId === 'string'
        ? data.helperId
        : data?.helperId?._id
        ? String(data.helperId._id)
        : typeof data?.providerId === 'string'
        ? data.providerId
        : data?.providerId?._id
        ? String(data.providerId._id)
        : data?.providerId
        ? String(data.providerId)
        : '',
    provider: helper,
    note: data?.note ?? data?.helperNote ?? '',
    expectedReturn: data?.expectedReturn ?? data?.paymentOffer ?? '',
    createdAt: data?.createdAt ?? data?.created_at ?? undefined,
    status: statusMap[statusRaw] ?? 'pending',
  };
};

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
  description: data?.description ?? data?.message ?? '',
  message: data?.message ?? data?.description ?? '',
  location: data?.location ?? '',
  createdAt: (data?.createdAt ?? null) as string | null,
  status: normalizeStatusValue(data?.status),
  offersCount:
    typeof data?.offersCount === 'number'
      ? data.offersCount
      : Array.isArray(data?.offers)
      ? data.offers.length
      : 0,
  visibility: data?.visibility === 'private' ? 'private' : 'public',
  requester: data?.requester?.name || data?.requester?.displayName || 'Anonymous',
  requesterId:
    data?.requester?._id
      ? String(data.requester._id)
      : data?.userId
      ? String(data.userId)
      : data?.requesterId
      ? String(data.requesterId)
      : null,
  type: data?.type === 'private' ? 'private' : 'public',
  paymentOffer: data?.paymentOffer ?? '',
  acceptedBy:
    data?.acceptedBy && typeof data.acceptedBy === 'object'
      ? String(data.acceptedBy._id ?? data.acceptedBy.id ?? data.acceptedBy)
      : data?.acceptedBy
      ? String(data.acceptedBy)
      : null,
  acceptedAt:
    typeof data?.acceptedAt === 'string'
      ? data.acceptedAt
      : data?.acceptedAt instanceof Date
      ? data.acceptedAt.toISOString()
      : null,
  requesterContactVisible:
    typeof data?.requesterContactVisible === 'boolean'
      ? data.requesterContactVisible
      : undefined,
});

const normalizeRequestFeedback = (data: any): ServiceRequestFeedback => {
  if (!data || typeof data !== 'object') {
    return { rating: null, comment: null };
  }
  const rating = typeof data.rating === 'number' ? data.rating : null;
  const rawComment = typeof data.comment === 'string' ? data.comment.trim() : '';
  return {
    id: data._id ? String(data._id) : data.id ? String(data.id) : undefined,
    rating,
    comment: rawComment ? rawComment : null,
    updatedAt:
      typeof data.updatedAt === 'string'
        ? data.updatedAt
        : data.updatedAt instanceof Date
        ? data.updatedAt.toISOString()
        : typeof data.createdAt === 'string'
        ? data.createdAt
        : data.createdAt instanceof Date
        ? data.createdAt.toISOString()
        : undefined,
  };
};

const normalizeRequest = (data: any): ServiceRequest => {
  const id = String(data._id ?? data.id ?? '');
  const offers = Array.isArray(data.offers)
    ? data.offers.map(normalizeOffer)
    : Array.isArray(data.offersData)
    ? data.offersData.map(normalizeOffer)
    : [];

  return {
    _id: id,
    id,
    userId:
      typeof data.userId === 'string'
        ? data.userId
        : data.userId?._id
        ? String(data.userId._id)
        : data.requester?._id
        ? String(data.requester._id)
        : '',
    type: data.type === 'private' ? 'private' : data.type === 'direct' ? 'direct' : 'public',
    serviceId:
      typeof data.serviceId === 'string' || data.serviceId === null
        ? data.serviceId
        : data.serviceId?._id
        ? String(data.serviceId._id)
        : null,
    service: data.service
      ? {
          _id: String(data.service._id ?? data.service.id ?? ''),
          id: String(data.service.id ?? data.service._id ?? ''),
          name: data.service.name ?? '',
          description: data.service.description ?? '',
          icon: data.service.icon ?? '',
        }
      : null,
    customName: data.customName ?? '',
    title: data.title ?? data.customName ?? '',
    message: data.message ?? data.details ?? data.description ?? '',
    description: data.description ?? data.message ?? '',
    details: data.details ?? data.message ?? data.desc ?? '',
    location: data.location ?? '',
    paymentOffer: data.paymentOffer ?? '',
    phone: data.phone ?? data.contactPhone ?? '',
    email: data.email ?? '',
    requester: data.requester ? normalizeUserSummary(data.requester) : null,
    requesterDisplayName: data.requester?.name ?? data.requester?.displayName,
    requesterContactVisible:
      typeof data.requesterContactVisible === 'boolean' ? data.requesterContactVisible : undefined,
    preferredDate: data.preferredDate ?? '',
    preferredTime: data.preferredTime ?? '',
    visibility: data.visibility === 'private' ? 'private' : 'public',
    status: normalizeStatusValue(data.status),
    adminNotes: data.adminNotes ?? '',
    reopenedCount: typeof data.reopenedCount === 'number' ? data.reopenedCount : 0,
    acceptedBy:
      data.acceptedBy && typeof data.acceptedBy === 'object'
        ? String(data.acceptedBy._id ?? data.acceptedBy.id ?? data.acceptedBy)
        : data.acceptedBy
        ? String(data.acceptedBy)
        : null,
    acceptedHelper:
      data.acceptedHelper && typeof data.acceptedHelper === 'object'
        ? normalizeUserSummary(data.acceptedHelper)
        : data.acceptedBy && typeof data.acceptedBy === 'object' && data.acceptedBy._id
        ? normalizeUserSummary(data.acceptedBy)
        : null,
    acceptedAt:
      typeof data.acceptedAt === 'string'
        ? data.acceptedAt
        : data.acceptedAt instanceof Date
        ? data.acceptedAt.toISOString()
        : null,
    directTargetUserId:
      typeof data.directTargetUserId === 'string'
        ? data.directTargetUserId
        : data.directTargetUserId?._id
        ? String(data.directTargetUserId._id)
        : null,
    providerNote: data.providerNote ?? '',
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
    offers,
    offersCount: typeof data.offersCount === 'number' ? data.offersCount : offers.length,
    history: Array.isArray(data.history) ? data.history.map(normalizeHistory) : [],
    isAnonymizedPublic:
      typeof data.isAnonymizedPublic === 'boolean' ? data.isAnonymizedPublic : undefined,
    myOffer: data.myOffer
      ? {
          id: String(data.myOffer.id ?? data.myOffer._id ?? ''),
          helperNote: data.myOffer.helperNote ?? '',
          expectedReturn: data.myOffer.expectedReturn ?? '',
          status: normalizeOffer(data.myOffer).status,
        }
      : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    feedback:
      typeof data.feedback === 'undefined'
        ? undefined
        : data.feedback === null
        ? null
        : normalizeRequestFeedback(data.feedback),
  };
};

const applyRequestUpdate = (state: Draft<ServiceRequestsState>, updated: ServiceRequest) => {
  const merge = (item: ServiceRequest): ServiceRequest => ({
    ...item,
    ...updated,
    feedback: typeof updated.feedback === 'undefined' ? item.feedback : updated.feedback,
  });

  state.mine.items = state.mine.items.map((item) =>
    item._id === updated._id ? merge(item) : item
  );
  state.assigned.items = state.assigned.items.map((item) =>
    item._id === updated._id ? merge(item) : item
  );
  state.admin.items = state.admin.items.map((item) =>
    item._id === updated._id ? merge(item) : item
  );
  state.publicList.items = state.publicList.items.map((item) =>
    item._id === updated._id
      ? {
          ...item,
          title: updated.service?.name || updated.customName || item.title,
          description: updated.description ?? item.description,
          status: updated.status,
          offersCount: updated.offersCount,
          acceptedBy: updated.acceptedBy ?? item.acceptedBy,
          acceptedAt: updated.acceptedAt ?? item.acceptedAt,
        }
      : item
  );
  if (state.detail.item && state.detail.item._id === updated._id) {
    state.detail.item = merge(state.detail.item);
  } else if (state.detail.currentId === updated._id) {
    state.detail.item = merge(updated);
  }
};

interface PublicRequestsResponse {
  items: PublicServiceRequest[];
  page: number;
  pageSize: number;
  total: number;
}

interface AdminRequestsResponse {
  items: ServiceRequest[];
  total: number;
  page: number;
  pageSize: number;
}

export const createServiceRequest = createAsyncThunk<
  ServiceRequest,
  CreateServiceRequestPayload,
  { rejectValue: string }
>(
  'serviceRequests/create',
  async (payload, thunkApi) => {
    try {
      const body: Record<string, any> = { ...payload };
      body.title =
        payload.title ||
        payload.customName ||
        payload.details ||
        payload.description ||
        'Service request';
      body.message = payload.message || payload.details || payload.description || '';
      if (payload.visibility) body.type = payload.visibility;
      if (payload.type) body.type = payload.type;
      if (payload.paymentOffer) body.paymentOffer = payload.paymentOffer;

      const res = await http.post('/service-requests', body);
      const data = res?.data?.data ?? res?.data ?? {};
      const requestData = data.request ?? data;
      const request = normalizeRequest(requestData);
      return request;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const createDirectServiceRequest = createAsyncThunk<
  ServiceRequest,
  CreateServiceRequestPayload,
  { rejectValue: string }
>(
  'serviceRequests/createDirect',
  async (payload, thunkApi) => {
    try {
      const body: Record<string, any> = { ...payload };
      body.title =
        payload.title ||
        payload.customName ||
        payload.details ||
        payload.description ||
        'Service request';
      body.message = payload.message || payload.details || payload.description || '';
      body.paymentOffer = payload.paymentOffer;
      if (!body.directTargetUserId && payload.providerId) body.directTargetUserId = payload.providerId;

      const res = await http.post('/service-requests/direct', body);
      const data = res?.data?.data ?? res?.data ?? {};
      const request = data.request ? normalizeRequest(data.request) : normalizeRequest(data);
      return request;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const fetchMyServiceRequests = createAsyncThunk<
  ServiceRequest[],
  void,
  { rejectValue: string }
>(
  'serviceRequests/fetchMine',
  async (_unused, thunkApi) => {
    try {
      const res = await http.get('/service-requests/my-requests');
      const body = res?.data?.data ?? res?.data ?? {};
      const items = toItems(body).map(normalizeRequest);
      return items as ServiceRequest[];
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const fetchAssignedServiceRequests = createAsyncThunk<
  ServiceRequest[],
  void,
  { rejectValue: string }
>(
  'serviceRequests/fetchAssigned',
  async (_unused, thunkApi) => {
    try {
      const res = await http.get('/service-requests/my-services');
      const body = res?.data?.data ?? res?.data ?? {};
      const items = toItems(body.requests ?? body.items ?? body).map(normalizeRequest);
      return items;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const fetchServiceRequestById = createAsyncThunk<
  ServiceRequest,
  string,
  { rejectValue: string }
>(
  'serviceRequests/fetchById',
  async (id, thunkApi) => {
    try {
      const res = await http.get(`/service-requests/${id}`);
      const data = res?.data?.data ?? res?.data ?? {};
      const requestData = data.request ?? data;
      const request = normalizeRequest(requestData);
      return request;
    } catch (error) {
      const message = toErrorMessage(error);
      if (message && message.toLowerCase().includes('not authorized')) {
        return thunkApi.rejectWithValue(
          'You can only view your own service requests. Please sign in with the account that created this request.'
        );
      }
      return thunkApi.rejectWithValue(message);
    }
  }
);

export const fetchPublicServiceRequests = createAsyncThunk<
  PublicRequestsResponse,
  { page?: number; pageSize?: number; q?: string; serviceId?: string } | undefined,
  { rejectValue: string }
>(
  'serviceRequests/fetchPublic',
  async (params, thunkApi) => {
    try {
      const res = await http.get('/service-requests/public', { params });
      const body = res?.data?.data ?? res?.data ?? {};
      const items = Array.isArray(body.items) ? body.items.map(normalizePublicRequest) : [];
      const page = typeof body.page === 'number' ? body.page : params?.page ?? 1;
      const pageSize =
        typeof body.pageSize === 'number' ? body.pageSize : params?.pageSize ?? items.length;
      const total = typeof body.total === 'number' ? body.total : items.length;
      return { items, page, pageSize, total };
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const acceptPublicServiceRequest = createAsyncThunk<
  ServiceRequest,
  { id: string },
  { rejectValue: string }
>(
  'serviceRequests/acceptPublic',
  async ({ id }, thunkApi) => {
    try {
      const res = await http.post(`/service-requests/${id}/offers`, {});
      const body = res?.data?.data ?? res?.data ?? {};
      const request = body.request ? normalizeRequest(body.request) : normalizeRequest(body);
      return request;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const updateServiceRequestStatus = createAsyncThunk<
  ServiceRequest,
  { id: string; status: ServiceRequestStatus },
  { rejectValue: string }
>(
  'serviceRequests/updateStatus',
  async ({ id, status }, thunkApi) => {
    try {
      const statusMap: Record<ServiceRequestStatus, string> = {
        pending: 'Pending',
        awaiting_approval: 'AwaitingApproval',
        accepted: 'Accepted',
        in_progress: 'InProgress',
        completed: 'Completed',
        cancelled: 'Cancelled',
        rejected: 'Rejected',
      };
      const res = await http.patch(`/service-requests/${id}/status`, {
        status: statusMap[status] ?? 'Pending',
      });
      const data = res?.data?.data ?? res?.data ?? {};
      const requestData = data.request ?? data;
      const request = normalizeRequest(requestData);
      return request;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const submitServiceOffer = createAsyncThunk<
  ServiceRequest,
  { requestId: string; payload: SubmitServiceOfferPayload },
  { rejectValue: string }
>(
  'serviceRequests/submitOffer',
  async ({ requestId, payload }, thunkApi) => {
    try {
      const res = await http.post(`/service-requests/${requestId}/offers`, payload);
      const data = res?.data?.data ?? res?.data ?? {};
      const request = data.request ? normalizeRequest(data.request) : normalizeRequest(data);
      return request;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const actOnServiceOffer = createAsyncThunk<
  ServiceRequest,
  { requestId: string; offerId: string; payload: ActOnServiceOfferPayload },
  { rejectValue: string }
>(
  'serviceRequests/actOnOffer',
  async ({ requestId, offerId, payload }, thunkApi) => {
    try {
      const endpoint =
        payload.action === 'accept'
          ? `/service-requests/${requestId}/offers/${offerId}/accept`
          : `/service-requests/${requestId}/offers/${offerId}/reject`;
      const res = await http.patch(endpoint, payload.providerNote ? { providerNote: payload.providerNote } : undefined);
      const data = res?.data?.data ?? res?.data ?? {};
      const request = data.request ? normalizeRequest(data.request) : normalizeRequest(data);
      return request;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const acceptDirectRequest = createAsyncThunk<
  ServiceRequest,
  { id: string; providerNote?: string },
  { rejectValue: string }
>(
  'serviceRequests/acceptDirect',
  async ({ id, providerNote }, thunkApi) => {
    try {
      const res = await http.patch(`/service-requests/${id}/accept-direct`, providerNote ? { providerNote } : undefined);
      const data = res?.data?.data ?? res?.data ?? {};
      const request = data.request ? normalizeRequest(data.request) : normalizeRequest(data);
      return request;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const rejectDirectRequest = createAsyncThunk<
  ServiceRequest,
  { id: string },
  { rejectValue: string }
>(
  'serviceRequests/rejectDirect',
  async ({ id }, thunkApi) => {
    try {
      const res = await http.patch(`/service-requests/${id}/reject-direct`);
      const data = res?.data?.data ?? res?.data ?? {};
      const request = data.request ? normalizeRequest(data.request) : normalizeRequest(data);
      return request;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const completeServiceRequest = createAsyncThunk<
  ServiceRequest,
  { id: string; message?: string },
  { rejectValue: string }
>(
  'serviceRequests/complete',
  async ({ id, message }, thunkApi) => {
    try {
      const body: Record<string, any> = { status: 'Completed' };
      if (message) body.message = message;
      const res = await http.patch(`/service-requests/${id}/status`, body);
      const data = res?.data?.data ?? res?.data ?? {};
      const requestData = data.request ?? data;
      const request = normalizeRequest(requestData);
      return request;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const reopenServiceRequest = createAsyncThunk<
  ServiceRequest,
  { id: string; message?: string },
  { rejectValue: string }
>(
  'serviceRequests/reopen',
  async ({ id, message }, thunkApi) => {
    try {
      const body: Record<string, any> = { status: 'Pending' };
      if (message) body.message = message;
      const res = await http.patch(`/service-requests/${id}/status`, body);
      const data = res?.data?.data ?? res?.data ?? {};
      const requestData = data.request ?? data;
      const request = normalizeRequest(requestData);
      return request;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const cancelServiceRequest = createAsyncThunk<
  ServiceRequest,
  string,
  { rejectValue: string }
>(
  'serviceRequests/cancel',
    async (id, thunkApi) => {
      try {
        const res = await http.patch(`/service-requests/${id}/status`, { status: 'Cancelled' });
        const data = res?.data?.data ?? res?.data ?? {};
        const requestData = data.request ?? data;
        const request = normalizeRequest(requestData);
        return request;
      } catch (error) {
        return thunkApi.rejectWithValue(toErrorMessage(error));
      }
    }
  );

export const adminFetchServiceRequests = createAsyncThunk<
  AdminRequestsResponse,
  Record<string, unknown> | undefined,
  { rejectValue: string }
>(
  'serviceRequests/adminFetch',
  async (params, thunkApi) => {
    try {
      const res = await adminHttp.get('/requests', { params });
      const body = res?.data?.data ?? res?.data ?? {};
      const items = Array.isArray(body.items) ? body.items.map(normalizeRequest) : [];
      const total = typeof body.total === 'number' ? body.total : items.length;
      const page = typeof body.page === 'number' ? body.page : params?.page ?? 1;
      const pageSize = typeof body.pageSize === 'number' ? body.pageSize : params?.pageSize ?? items.length;
      return { items, total, page, pageSize };
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const adminFetchProviders = createAsyncThunk<
  ServiceProviderUser[],
  void,
  { rejectValue: string }
>(
  'serviceRequests/adminFetchProviders',
  async (_unused, thunkApi) => {
    try {
      const res = await adminHttp.get('/admin/users', {
        params: { role: 'business', pageSize: 200 },
      });
      const items = toItems(res).map(normalizeUserSummary);
      return items;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
    }
  }
);

export const adminUpdateServiceRequest = createAsyncThunk<
  ServiceRequest,
  { id: string; status?: ServiceRequestStatus | string; notes?: string; providerId?: string | null },
  { rejectValue: string }
>(
  'serviceRequests/adminUpdate',
  async ({ id, status, notes, providerId }, thunkApi) => {
    try {
      const body: Record<string, unknown> = {};
      if (typeof status !== 'undefined') body.status = status;
      if (typeof notes !== 'undefined') body.adminNotes = notes;
      if (typeof providerId !== 'undefined') body.providerId = providerId ?? null;
      const res = await adminHttp.patch(`/requests/${id}`, body);
      const data = res?.data?.data ?? res?.data ?? {};
      const request = data.request ? normalizeRequest(data.request) : null;
      if (!request) throw new Error('Invalid request response');
      return request;
    } catch (error) {
      return thunkApi.rejectWithValue(toErrorMessage(error));
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
      .addCase(createServiceRequest.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        state.createStatus = 'succeeded';
        state.createError = null;
        state.publicList.status = 'idle';
        state.mine.items = [action.payload, ...state.mine.items];
        applyRequestUpdate(state, action.payload);
      })
      .addCase(createServiceRequest.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload ?? action.error.message ?? 'Failed to submit request';
      })
      .addCase(createDirectServiceRequest.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(createDirectServiceRequest.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        state.createStatus = 'succeeded';
        state.createError = null;
        state.mine.items = [action.payload, ...state.mine.items];
        applyRequestUpdate(state, action.payload);
      })
      .addCase(createDirectServiceRequest.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload ?? action.error.message ?? 'Failed to send direct request';
      })
      .addCase(fetchMyServiceRequests.pending, (state) => {
        state.mine.status = 'loading';
        state.mine.error = null;
      })
      .addCase(fetchMyServiceRequests.fulfilled, (state, action: PayloadAction<ServiceRequest[]>) => {
        state.mine.status = 'succeeded';
        state.mine.items = action.payload;
        if (state.detail.item) {
          const match = action.payload.find((item) => item._id === state.detail.item?._id);
          if (match) state.detail.item = match;
        }
      })
      .addCase(fetchMyServiceRequests.rejected, (state, action) => {
        state.mine.status = 'failed';
        state.mine.error = action.payload ?? action.error.message ?? 'Failed to load requests';
      })
      .addCase(fetchAssignedServiceRequests.pending, (state) => {
        state.assigned.status = 'loading';
        state.assigned.error = null;
      })
      .addCase(fetchAssignedServiceRequests.fulfilled, (state, action: PayloadAction<ServiceRequest[]>) => {
        state.assigned.status = 'succeeded';
        state.assigned.items = action.payload;
      })
      .addCase(fetchAssignedServiceRequests.rejected, (state, action) => {
        state.assigned.status = 'failed';
        state.assigned.error = action.payload ?? action.error.message ?? 'Failed to load services';
      })
      .addCase(fetchServiceRequestById.pending, (state, action) => {
        state.detail.status = 'loading';
        state.detail.error = null;
        state.detail.currentId = action.meta.arg;
      })
      .addCase(fetchServiceRequestById.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        state.detail.status = 'succeeded';
        state.detail.error = null;
        state.detail.currentId = action.payload._id;
        applyRequestUpdate(state, action.payload);
        if (!state.detail.item || state.detail.item._id !== action.payload._id) {
          state.detail.item = action.payload;
        }
      })
      .addCase(fetchServiceRequestById.rejected, (state, action) => {
        state.detail.status = 'failed';
        state.detail.error = action.payload ?? action.error.message ?? 'Failed to load request';
        if (state.detail.currentId === action.meta.arg) {
          state.detail.item = null;
        }
      })
      .addCase(fetchPublicServiceRequests.pending, (state) => {
        state.publicList.status = 'loading';
        state.publicList.error = null;
      })
      .addCase(fetchPublicServiceRequests.fulfilled, (state, action: PayloadAction<PublicRequestsResponse>) => {
        state.publicList.status = 'succeeded';
        state.publicList.items = action.payload.items;
        state.publicList.page = action.payload.page;
        state.publicList.pageSize = action.payload.pageSize;
        state.publicList.total = action.payload.total;
      })
      .addCase(fetchPublicServiceRequests.rejected, (state, action) => {
        state.publicList.status = 'failed';
        state.publicList.error = action.payload ?? action.error.message ?? 'Failed to load public requests';
      })
      .addCase(acceptPublicServiceRequest.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        applyRequestUpdate(state, action.payload);
        const exists = state.assigned.items.some((item) => item._id === action.payload._id);
        if (!exists) state.assigned.items = [action.payload, ...state.assigned.items];
      })
      .addCase(updateServiceRequestStatus.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        applyRequestUpdate(state, action.payload);
        const exists = state.assigned.items.some((item) => item._id === action.payload._id);
        if (!exists) state.assigned.items = [action.payload, ...state.assigned.items];
      })
      .addCase(adminFetchServiceRequests.pending, (state) => {
        state.admin.status = 'loading';
        state.admin.error = null;
      })
      .addCase(adminFetchServiceRequests.fulfilled, (state, action: PayloadAction<AdminRequestsResponse>) => {
        state.admin.status = 'succeeded';
        state.admin.items = action.payload.items;
        state.admin.total = action.payload.total;
        state.admin.page = action.payload.page;
        state.admin.pageSize = action.payload.pageSize;
        if (state.detail.item) {
          const match = action.payload.items.find((item) => item._id === state.detail.item?._id);
          if (match) state.detail.item = match;
        }
      })
      .addCase(adminFetchServiceRequests.rejected, (state, action) => {
        state.admin.status = 'failed';
        state.admin.error = action.payload ?? action.error.message ?? 'Failed to load service requests';
      })
      .addCase(adminFetchProviders.pending, (state) => {
        state.providers.status = 'loading';
        state.providers.error = null;
      })
      .addCase(adminFetchProviders.fulfilled, (state, action: PayloadAction<ServiceProviderUser[]>) => {
        state.providers.status = 'succeeded';
        state.providers.items = action.payload;
      })
      .addCase(adminFetchProviders.rejected, (state, action) => {
        state.providers.status = 'failed';
        state.providers.error = action.payload ?? action.error.message ?? 'Failed to load providers';
      })
      .addCase(submitServiceOffer.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        applyRequestUpdate(state, action.payload);
      })
      .addCase(actOnServiceOffer.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        applyRequestUpdate(state, action.payload);
      })
      .addCase(acceptDirectRequest.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        applyRequestUpdate(state, action.payload);
      })
      .addCase(rejectDirectRequest.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        applyRequestUpdate(state, action.payload);
      })
      .addCase(completeServiceRequest.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        applyRequestUpdate(state, action.payload);
      })
      .addCase(reopenServiceRequest.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        applyRequestUpdate(state, action.payload);
      })
      .addCase(cancelServiceRequest.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        applyRequestUpdate(state, action.payload);
      })
      .addCase(adminUpdateServiceRequest.fulfilled, (state, action: PayloadAction<ServiceRequest>) => {
        applyRequestUpdate(state, action.payload);
      });
  },
});

export default serviceRequestsSlice.reducer;

export const selectServiceRequestsState = (state: { serviceRequests: ServiceRequestsState }) =>
  state.serviceRequests;

export const selectMyServiceRequests = (state: { serviceRequests: ServiceRequestsState }) =>
  state.serviceRequests.mine.items;

export const selectMyServiceRequestsStatus = (state: {
  serviceRequests: ServiceRequestsState;
}) => state.serviceRequests.mine.status;

export const selectServiceRequestDetailState = (state: {
  serviceRequests: ServiceRequestsState;
}) => state.serviceRequests.detail;

export const selectServiceRequestDetail = (state: { serviceRequests: ServiceRequestsState }) =>
  state.serviceRequests.detail.item;
