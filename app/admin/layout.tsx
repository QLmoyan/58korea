import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/share/constants";

export const metadata: Metadata = {
  title: `运营后台 - ${SITE_NAME}`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
