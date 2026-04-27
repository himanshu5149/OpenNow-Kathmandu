export type TabType = 'map' | 'search' | 'profile' | 'leaderboard';

export interface Business {
  id: string;
  name: string;
  category: string;
  address?: string;
  lat: number;
  lng: number;
  status_open_count: number;
  status_total_count: number;
  last_status_update?: any;
  phone?: string | null;
  website?: string | null;
  opening_hours?: string | null;
}

export interface StatusReport {
  id: string;
  business_id: string;
  user_id: string;
  is_open: boolean;
  confidence: number;
  timestamp: any;
  photo_url?: string;
  disputed?: boolean;
}

export interface Dispute {
  id: string;
  report_id: string;
  business_id: string;
  user_id: string; // reporter of dispute
  reason: string;
  timestamp: any;
}

export interface UserProfile {
  uid: string;
  name: string;
  karma: number;
  verification_count: number;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}
