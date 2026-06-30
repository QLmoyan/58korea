export type MerchantApplicationStatus = "pending" | "approved" | "rejected";

export interface MerchantApplication {
  id: string;
  userId: string;
  businessName: string;
  category: string;
  address: string;
  contact: string;
  proofNote: string | null;
  status: MerchantApplicationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MerchantApplyUiState =
  | { kind: "verified"; businessName: string }
  | { kind: "pending"; application: MerchantApplication }
  | { kind: "rejected"; application: MerchantApplication }
  | { kind: "eligible" };

export interface SubmitMerchantApplicationInput {
  businessName: string;
  category: string;
  address: string;
  contact: string;
  proofNote?: string;
}
