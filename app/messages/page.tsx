import type { Metadata } from "next";
import MessageCenterContent from "@/components/messages/MessageCenterContent";

export const metadata: Metadata = {
  title: "消息 - 58韩国",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MessagesPage() {
  return <MessageCenterContent />;
}
