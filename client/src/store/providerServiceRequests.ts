import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toErrorMessage, toItems, toItem } from '@/lib/response';

export type ProviderAssignmentStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'open';

export interface ProviderServiceRequest {
  id: string;
  title: string;
  description: string;
  location?: string;
  phone?: string;
  customerName?: string;
  status: ProviderAssignmentStatus;
  serviceName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProviderServiceRequestsState {
  items: ProviderServiceRequest[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  updating: Record<string, ProviderAssignmentStatus | undefined>;
}

const initialState: ProviderServiceRequestsState = {
  items: [],
  status: 'idle',
  error: null,
  updating: {},
};

const normalizeStatus = (rawStatus: unknown): ProviderAssignmentStatus => {
  if (typeof rawStatus !== 'string' || !rawStatus.trim()) return 'pending';
  const normalized = rawStatus.trim().toLowerCase().replace(/\s+/g, '_');
  if (
    normalized === 'pending' ||
    normalized === 'assigned' ||
    normalized === 'in_progress' ||
    normalized === 'completed' ||
    normalized === 'cancelled' ||
    normalized === 'open'
  ) {
    return normalized;
  }
  return 'pending';
};

const extractString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const normalizeAssignedRequest = (entry: any, index: number): ProviderServiceRequest => {
  const idSource =
    extractString(entry?._id) ||
    extractString(entry?.id) ||
    extractString(entry?.requestId) ||
    `provider-request-${index}`;

  const serviceName =
    extractString(entry?.serviceName) ||
    extractString(entry?.service?.name) ||
    extractString(entry?.serviceId?.name) ||
    extractString(entry?.title) ||
    extractString(entry?.customName) ||
    'Service request';

  const description =
    extractString(entry?.description) || extractString(entry?.details) || 'No description provided.';

  const location =
    extractString(entry?.location) ||
    extractString(entry?.address) ||
    extractString(entry?.customerLocation) ||
    extractString(entry?.requester?.location);

  const phone =
    extractString(entry?.phone) ||
    extractString(entry?.contactPhone) ||
    extractString(entry?.requester?.phone) ||
    extractString(entry?.user?.phone);

  const customerName =
    extractString(entry?.customerName) ||
    extractString(entry?.requester?.name) ||
    extractString(entry?.user?.name);

  const status = normalizeStatus(entry?.status);

  return {
    id: idSource,
    title: serviceName,
    description,
    location,
    phone,
    customerName,
    status,
    serviceName,
    createdAt: extractString(entry?.createdAt),
    updatedAt: extractString(entry?.updatedAt),
  };
};

export const fetchAssignedRequests = createAsyncThunk(
  'providerServiceRequests/fetchAssigned',
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await http.get('/api/services/requests/assigned');
      const items = toItems(res);
      const safeItems = Array.isArray(items)
        ? items.map((item, index) => normalizeAssignedRequest(item, index))
        : [];
      return safeItems;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  },
);

export const updateAssignedRequestStatus = createAsyncThunk(
  'providerServiceRequests/updateStatus',
  async (
    {
      id,
      status,
    }: { id: string; status: ProviderAssignmentStatus },
    { rejectWithValue },
  ) => {
    try {
      const res = await http.patch(`/api/services/requests/${id}`, {
        status: status.toUpperCase(),
      });
      const item = toItem(res);
      return normalizeAssignedRequest(item, 0);
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  },
);

const providerServiceRequestsSlice = createSlice({
  name: 'providerServiceRequests',
  initialState,
  reducers: {
    revertStatus(
      state,
      action: PayloadAction<{ id: string; status: ProviderAssignmentStatus | undefined }>,
    ) {
      const { id, status } = action.payload;
      state.items = state.items.map((item) =>
        item.id === id ? { ...item, status: status ?? item.status } : item,
      );
      delete state.updating[id];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignedRequests.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAssignedRequests.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAssignedRequests.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message || 'Failed to load requests';
      })
      .addCase(updateAssignedRequestStatus.pending, (state, action) => {
        const { id, status } = action.meta.arg;
        state.updating[id] = status;
        state.items = state.items.map((item) =>
          item.id === id ? { ...item, status } : item,
        );
      })
      .addCase(updateAssignedRequestStatus.fulfilled, (state, action) => {
        const updated = action.payload;
        state.items = state.items.map((item) => (item.id === updated.id ? updated : item));
        delete state.updating[updated.id];
      })
      .addCase(updateAssignedRequestStatus.rejected, (state, action) => {
        const { id } = action.meta.arg;
        state.error = (action.payload as string) || action.error.message || 'Failed to update request';
        delete state.updating[id];
      });
  },
});

export const { revertStatus } = providerServiceRequestsSlice.actions;

export default providerServiceRequestsSlice.reducer;
