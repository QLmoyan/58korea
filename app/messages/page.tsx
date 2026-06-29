import type { Metadata } from "next";
import MessageCenterContent from "@/components/messages/MessageCenterContent";
import { SITE_NAME } from "@/lib/share/constants";

export const metadata: Metadata = {
  title: `消息 - ${SITE_NAME}`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function MessagesPage() {
  return <MessageCenterContent />;
}
