import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "运营后台 - 58韩国",
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
