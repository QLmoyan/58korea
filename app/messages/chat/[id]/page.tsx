import type { Metadata } from "next";
import ChatConversationContent from "@/components/chat/ChatConversationContent";
import { SITE_NAME } from "@/lib/share/constants";

export const metadata: Metadata = {
  title: `私信 - ${SITE_NAME}`,
  robots: {
    index: false,
    follow: false,
  },
};

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  return <ChatConversationContent conversationId={id} />;
}
