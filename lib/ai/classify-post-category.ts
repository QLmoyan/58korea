import {
  isPostCategory,
  POST_CATEGORIES,
  type PostCategory,
} from "@/lib/data/posts";

const SYSTEM_PROMPT = `你是 58korea 的帖子分类器。
只能从以下分类中选择一个：
探店、求助、房屋、二手、招聘、攻略、其他。
根据标题和正文判断最合适分类。
返回 JSON：
{
  "category": "...",
  "confidence": 0.0-1.0,
  "reason": "简短原因"
}`;

export type ClassifyPostCategoryResult =
  | { ok: true; category: PostCategory; confidence: number; reason: string }
  | { ok: false; error: string };

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

function clampConfidence(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, numeric));
}

function parseClassifierPayload(raw: string): ClassifyPostCategoryResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "invalid_json_response" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "invalid_json_shape" };
  }

  const record = parsed as Record<string, unknown>;
  const category = typeof record.category === "string" ? record.category.trim() : "";

  if (!isPostCategory(category)) {
    return {
      ok: false,
      error: `invalid_category:${category || "empty"}`,
    };
  }

  const reason =
    typeof record.reason === "string" && record.reason.trim()
      ? record.reason.trim()
      : "AI 分类";

  return {
    ok: true,
    category,
    confidence: clampConfidence(record.confidence),
    reason,
  };
}

export async function classifyPostCategory(
  title: string,
  content: string,
): Promise<ClassifyPostCategoryResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "missing_openai_api_key" };
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `标题：${title.trim()}\n\n正文：${content.trim()}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        error: `openai_http_${response.status}:${errorText.slice(0, 200)}`,
      };
    }

    const payload = (await response.json()) as OpenAIChatResponse;
    const rawContent = payload.choices?.[0]?.message?.content;

    if (!rawContent?.trim()) {
      return { ok: false, error: "empty_openai_response" };
    }

    return parseClassifierPayload(rawContent.trim());
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "openai_request_failed",
    };
  }
}

export function getAllowedPostCategories(): readonly PostCategory[] {
  return POST_CATEGORIES;
}
