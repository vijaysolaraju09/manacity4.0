export interface VerifiedCard {
  id: string;
  _id: string;
  user: {
    _id: string;
    name: string;
    phone: string;
    location?: string;
    address?: string;
  };
  profession: string;
  bio: string;
  portfolio: string[];
  status: 'pending' | 'approved' | 'rejected';
  ratingAvg?: number;
  ratingCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
