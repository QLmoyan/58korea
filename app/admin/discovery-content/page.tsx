import type { Metadata } from "next";
import DiscoveryContentPanel from "@/components/admin/DiscoveryContentPanel";
import { AdminCapabilitiesProvider } from "@/components/admin/AdminCapabilitiesProvider";
import { SITE_NAME } from "@/lib/share/constants";

export const metadata: Metadata = {
  title: `发现页内容编辑 - 运营后台 - ${SITE_NAME}`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminDiscoveryContentPage() {
  return (
    <AdminCapabilitiesProvider>
      <DiscoveryContentPanel />
    </AdminCapabilitiesProvider>
  );
}
