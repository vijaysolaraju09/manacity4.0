export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: 'customer' | 'business' | 'admin';
  location: string;
  address: string;
  isVerified: boolean;
  verificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  profession?: string;
  bio?: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  preferences?: { theme: 'light' | 'dark' | 'colored' };
  businessStatus?: 'none' | 'pending' | 'approved' | 'rejected';
}
