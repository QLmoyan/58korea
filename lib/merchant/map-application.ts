import type { Database } from "@/lib/supabase/database.types";
import type { MerchantApplication } from "@/lib/types/merchant-application";

type ApplicationRow = Database["public"]["Tables"]["merchant_applications"]["Row"];

export function mapMerchantApplication(row: ApplicationRow): MerchantApplication {
  return {
    id: row.id,
    userId: row.user_id,
    businessName: row.business_name,
    category: row.category,
    address: row.address,
    contact: row.contact,
    proofNote: row.proof_note,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectReason: row.reject_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
