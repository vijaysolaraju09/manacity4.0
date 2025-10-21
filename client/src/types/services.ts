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
}

export interface ServiceProviderUser {
  _id: string;
  name: string;
  phone?: string;
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
  notes?: string;
  bio?: string;
  profession?: string;
  source?: string;
}

export interface ServiceRequest {
  _id: string;
  id: string;
  userId: string;
  serviceId: string | null;
  service?: Pick<Service, '_id' | 'id' | 'name' | 'description' | 'icon'> | null;
  customName?: string;
  description?: string;
  location?: string;
  phone?: string;
  preferredDate?: string;
  preferredTime?: string;
  status: 'open' | 'assigned' | 'closed' | 'rejected';
  adminNotes?: string;
  assignedProviders?: ServiceProviderUser[];
  assignedProviderIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateServiceRequestPayload {
  serviceId?: string;
  customName?: string;
  description?: string;
  location?: string;
  phone?: string;
  preferredDate?: string;
  preferredTime?: string;
}

export interface UpdateServiceRequestPayload {
  status?: ServiceRequest['status'];
  adminNotes?: string;
  assignedProviderIds?: string[];
}

export interface UpsertServicePayload {
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}
