export interface MerchantProfile {
  id: string;
  userId: string;
  username: string | null;
  businessName: string;
  logoUrl: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  businessHours: string | null;
  navigationUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantSummary {
  merchantProfileId: string;
  userId: string;
  username: string;
  businessName: string;
  authorName: string | null;
}
