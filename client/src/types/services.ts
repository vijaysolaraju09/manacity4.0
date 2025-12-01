export interface Service {
  _id: string;
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  serviceArea?: string;
  startingPricePaise?: number;
  title?: string;
  images?: string[];
  providers?: string[];
}

export interface ServiceProviderUser {
  _id: string;
  name: string;
  phone?: string;
  email?: string | null;
  location?: string;
  address?: string;
  avatarUrl?: string;
  profession?: string;
  bio?: string;
}

export interface ServiceProvider {
  id: string;
  mapId?: string;
  serviceId?: string;
  user?: ServiceProviderUser | null;
  ratingAvg?: number;
  ratingCount?: number;
  completedCount?: number;
  notes?: string;
  bio?: string;
  profession?: string;
  source?: string;
}

export type ServiceRequestStatus =
  | 'pending'
  | 'awaiting_approval'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface ServiceRequestOffer {
  _id: string;
  providerId: string;
  provider?: ServiceProviderUser | null;
  note: string;
  expectedReturn?: string;
  createdAt?: string;
  status: 'pending' | 'accepted_by_seeker' | 'rejected_by_seeker';
}

export interface ServiceRequestHistoryEntry {
  at: string | null;
  by: string | null;
  type: 'created' | 'offer' | 'assigned' | 'completed' | 'closed' | 'reopened' | 'admin_note';
  message?: string | null;
}

export interface ServiceRequestFeedback {
  id?: string;
  rating: number | null;
  comment: string | null;
  updatedAt?: string | null;
}

export interface ServiceRequest {
  _id: string;
  id: string;
  userId: string;
  type: 'public' | 'private' | 'direct';
  serviceId: string | null;
  service?: Pick<Service, '_id' | 'id' | 'name' | 'description' | 'icon'> | null;
  customName?: string;
  title?: string;
  message?: string;
  description?: string;
  details?: string;
  location?: string;
  paymentOffer?: string;
  phone?: string;
  email?: string;
  requester?: ServiceProviderUser | null;
  requesterDisplayName?: string;
  requesterContactVisible?: boolean;
  preferredDate?: string;
  preferredTime?: string;
  visibility: 'public' | 'private';
  status: ServiceRequestStatus;
  adminNotes?: string;
  reopenedCount: number;
  acceptedBy: string | null;
  acceptedHelper?: ServiceProviderUser | null;
  acceptedAt?: string | null;
  directTargetUserId?: string | null;
  providerNote?: string;
  assignedProviderId: string | null;
  assignedProvider?: ServiceProviderUser | null;
  assignedProviders?: ServiceProviderUser[];
  assignedProviderIds?: string[];
  offers: ServiceRequestOffer[];
  offersCount: number;
  history: ServiceRequestHistoryEntry[];
  isAnonymizedPublic?: boolean;
  myOffer?: { id: string; helperNote?: string; expectedReturn?: string; status: ServiceRequestOffer['status'] };
  createdAt?: string;
  updatedAt?: string;
  feedback?: ServiceRequestFeedback | null;
}

export interface PublicServiceRequest {
  _id: string;
  id: string;
  serviceId: string | null;
  title: string;
  description: string;
  details?: string;
  message?: string;
  location: string;
  createdAt: string | null;
  status: ServiceRequestStatus;
  offersCount: number;
  visibility: 'public' | 'private';
  requester: string;
  requesterId?: string | null;
  type?: 'public' | 'private';
  paymentOffer?: string;
  acceptedBy?: string | null;
  acceptedAt?: string | null;
  requesterContactVisible?: boolean;
}

export interface CreateServiceRequestPayload {
  serviceId?: string;
  customName?: string;
  description?: string;
  details?: string;
  message?: string;
  title?: string;
  location?: string;
  phone?: string;
  contactPhone?: string;
  paymentOffer?: string;
  preferredDate?: string;
  preferredTime?: string;
  visibility?: 'public' | 'private';
  providerId?: string;
  type?: 'public' | 'private' | 'direct';
}

export interface UpdateServiceRequestPayload {
  status?: ServiceRequestStatus;
  adminNotes?: string;
  assignedProviderIds?: string[];
  assignedProviderId?: string | null;
  providerId?: string | null;
}

export interface SubmitServiceOfferPayload {
  helperNote?: string;
  expectedReturn?: string;
}

export interface ActOnServiceOfferPayload {
  action: 'accept' | 'reject';
  providerNote?: string;
}

export interface UpsertServicePayload {
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  providers?: string[];
}
