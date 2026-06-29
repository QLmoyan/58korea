import type { Metadata } from "next";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { AdminCapabilitiesProvider } from "@/components/admin/AdminCapabilitiesProvider";
import { SITE_NAME } from "@/lib/share/constants";

export const metadata: Metadata = {
  title: `运营后台 - ${SITE_NAME}`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <AdminCapabilitiesProvider>
      <AdminDashboard />
    </AdminCapabilitiesProvider>
  );
}
