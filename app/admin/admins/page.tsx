import type { Metadata } from "next";
import AdminAdminsPanel from "@/components/admin/AdminAdminsPanel";
import { AdminCapabilitiesProvider } from "@/components/admin/AdminCapabilitiesProvider";
import { SITE_NAME } from "@/lib/share/constants";

export const metadata: Metadata = {
  title: `管理员管理 - 运营后台 - ${SITE_NAME}`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminAdminsPage() {
  return (
    <AdminCapabilitiesProvider>
      <AdminAdminsPanel />
    </AdminCapabilitiesProvider>
  );
}
