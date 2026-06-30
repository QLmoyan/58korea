/**
 * Chat V1 acceptance integration test.
 * Run: npx tsx scripts/test-chat-v1.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registerUserAction } from "../lib/actions/register-user";
import { toInternalEmail } from "../lib/auth/username";
import { normalizeChatParticipants } from "../lib/chat/normalize-participants";
import type { Database } from "../lib/supabase/database.types";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }

  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  return env;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function signIn(
  url: string,
  anonKey: string,
  username: string,
  password: string,
) {
  const client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: toInternalEmail(username),
    password,
  });
  assert(!error, `sign in failed for ${username}: ${error?.message}`);
  return client;
}

async function getUserId(client: SupabaseClient<Database>) {
  const { data, error } = await client.auth.getUser();
  assert(!error && data.user?.id, "missing auth user");
  return data.user.id;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  assert(url && anonKey && serviceRoleKey, "Missing Supabase env vars");

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const password = "Test123456!";
  const userA = `chat_a_${String(stamp).slice(-6)}`;
  const userB = `chat_b_${String(stamp).slice(-6)}`;
  const userC = `chat_c_${String(stamp).slice(-6)}`;

  await registerUserAction({
    username: userA,
    password,
    nickname: `聊天甲${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: userB,
    password,
    nickname: `聊天乙${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: userC,
    password,
    nickname: `聊天丙${String(stamp).slice(-4)}`,
  });

  const clientA = await signIn(url, anonKey, userA, password);
  const clientB = await signIn(url, anonKey, userB, password);
  const clientC = await signIn(url, anonKey, userC, password);
  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const idA = await getUserId(clientA);
  const idB = await getUserId(clientB);
  const idC = await getUserId(clientC);

  const [participantA, participantB] = normalizeChatParticipants(idA, idB);

  const { data: conversation, error: conversationError } = await clientA
    .from("chat_conversations")
    .insert({
      participant_a: participantA,
      participant_b: participantB,
    })
    .select("id")
    .single();

  assert(!conversationError, `create conversation failed: ${conversationError?.message}`);
  const conversationId = conversation!.id;

  const { error: selfConversationError } = await clientA
    .from("chat_conversations")
    .insert({
      participant_a: idA,
      participant_b: idA,
    });
  assert(selfConversationError, "self conversation must be blocked");

  const { error: messageError } = await clientA.from("chat_messages").insert({
    conversation_id: conversationId,
    sender_id: idA,
    body: "你好，这是验收消息",
  });
  assert(!messageError, `send message failed: ${messageError?.message}`);

  await clientA
    .from("chat_conversations")
    .update({
      last_message: "你好，这是验收消息",
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  const { error: emptyMessageError } = await clientA.from("chat_messages").insert({
    conversation_id: conversationId,
    sender_id: idA,
    body: "   ",
  });
  assert(emptyMessageError, "blank message must be rejected by DB constraint");

  const { data: bConversations, error: bInboxError } = await clientB
    .from("chat_conversations")
    .select("id, last_message, last_message_at, participant_a, participant_b")
    .or(`participant_a.eq.${idB},participant_b.eq.${idB}`);

  assert(!bInboxError, `B inbox failed: ${bInboxError?.message}`);
  assert(
    (bConversations ?? []).some((row) => row.id === conversationId),
    "B must see conversation in inbox",
  );
  assert(
    bConversations?.[0]?.last_message === "你好，这是验收消息",
    "B inbox must show last message summary",
  );

  const { data: unreadBefore, error: unreadBeforeError } = await clientB
    .from("chat_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("is_read", false)
    .neq("sender_id", idB);

  assert(!unreadBeforeError, unreadBeforeError?.message);
  assert((unreadBefore ?? []).length === 1, "B unread count must be 1 before open");

  const { data: bMessages, error: bMessagesError } = await clientB
    .from("chat_messages")
    .select("id, body, sender_id")
    .eq("conversation_id", conversationId);

  assert(!bMessagesError, bMessagesError?.message);
  assert((bMessages ?? []).length === 1, "B must read messages as participant");

  const { error: markReadError } = await clientB
    .from("chat_messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", idB);

  assert(!markReadError, markReadError?.message);

  const { data: unreadAfter } = await clientB
    .from("chat_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("is_read", false)
    .neq("sender_id", idB);

  assert((unreadAfter ?? []).length === 0, "B unread must clear after read");

  const { error: bReplyError } = await clientB.from("chat_messages").insert({
    conversation_id: conversationId,
    sender_id: idB,
    body: "收到，谢谢",
  });
  assert(!bReplyError, `B reply failed: ${bReplyError?.message}`);

  const { data: aUnread } = await clientA
    .from("chat_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("is_read", false)
    .neq("sender_id", idA);

  assert((aUnread ?? []).length === 1, "A unread must be 1 after B replies");

  const { data: cConversation, error: cConversationError } = await clientC
    .from("chat_conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle();

  assert(!cConversationError, cConversationError?.message);
  assert(!cConversation, "non-participant must not read conversation");

  const { data: cMessages, error: cMessagesError } = await clientC
    .from("chat_messages")
    .select("id")
    .eq("conversation_id", conversationId);

  assert(!cMessagesError, cMessagesError?.message);
  assert(
    (cMessages ?? []).length === 0,
    "non-participant must not read chat messages",
  );

  const { error: anonConversationError } = await anon
    .from("chat_conversations")
    .select("id")
    .limit(1);
  assert(anonConversationError, "anon must not read chat_conversations");

  const { error: anonMessageError } = await anon
    .from("chat_messages")
    .select("id")
    .limit(1);
  assert(anonMessageError, "anon must not read chat_messages");

  const { error: cInsertError } = await clientC.from("chat_messages").insert({
    conversation_id: conversationId,
    sender_id: idC,
    body: "路人插话",
  });
  assert(cInsertError, "non-participant must not insert chat_messages");

  const { error: secondMessageError } = await clientA.from("chat_messages").insert({
    conversation_id: conversationId,
    sender_id: idA,
    body: "第二条验收消息",
  });
  assert(!secondMessageError, `second message failed: ${secondMessageError?.message}`);

  const { data: bMessagesAfterSecond, error: bMessagesAfterSecondError } =
    await clientB
      .from("chat_messages")
      .select("id, body")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

  assert(!bMessagesAfterSecondError, bMessagesAfterSecondError?.message);
  assert(
    (bMessagesAfterSecond ?? []).length >= 2,
    "B should see new messages on next fetch without re-entering",
  );
  assert(
    (bMessagesAfterSecond ?? []).some((row) => row.body === "第二条验收消息"),
    "B must receive latest message body",
  );

  const { count: bUnifiedUnread } = await clientB
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("is_read", false)
    .neq("sender_id", idB);

  assert((bUnifiedUnread ?? 0) === 1, "B unified chat unread must include latest message");

  const merchantLogoUrl = `https://example.com/merchant-logo-${stamp}.png`;
  const { error: merchantUpsertError } = await service
    .from("merchant_profiles")
    .upsert(
      {
        user_id: idA,
        business_name: `聊天商家${String(stamp).slice(-4)}`,
        logo_url: merchantLogoUrl,
        is_active: true,
        is_verified: true,
      },
      { onConflict: "user_id" },
    );
  assert(!merchantUpsertError, `merchant upsert failed: ${merchantUpsertError?.message}`);

  const { data: bPeerMerchant, error: bPeerMerchantError } = await clientB
    .from("merchant_profiles")
    .select("logo_url")
    .eq("user_id", idA)
    .eq("is_active", true)
    .maybeSingle();

  assert(!bPeerMerchantError, bPeerMerchantError?.message);
  assert(
    bPeerMerchant?.logo_url === merchantLogoUrl,
    "B must read peer merchant logo_url for chat avatar fallback",
  );

  console.log("PASS Chat V1 acceptance integration");
  console.log(`  conversationId=${conversationId}`);
  console.log(`  users: ${userA} -> ${userB}`);
}

main().catch((error) => {
  console.error("FAIL", error instanceof Error ? error.message : error);
  process.exit(1);
});
