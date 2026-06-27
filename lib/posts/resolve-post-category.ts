import {
  classifyPostCategory,
  type ClassifyPostCategoryResult,
} from "@/lib/ai/classify-post-category";
import { isPostCategory, type PostCategory } from "@/lib/data/posts";

export type CategorySource = "manual" | "ai" | "ai_fallback";

export const AI_AUTO_CATEGORY = "ai" as const;

export type PublishCategorySelection = typeof AI_AUTO_CATEGORY | PostCategory;

export interface ResolvedPostCategory {
  category: PostCategory;
  categorySource: CategorySource;
  aiCategoryConfidence: number | null;
  aiCategoryReason: string | null;
}

type ClassifyFn = (
  title: string,
  content: string,
) => Promise<ClassifyPostCategoryResult>;

export async function resolvePostCategoryForPublish(
  input: {
    categorySelection: PublishCategorySelection;
    title: string;
    content: string;
  },
  options?: {
    classify?: ClassifyFn;
  },
): Promise<ResolvedPostCategory> {
  const classify = options?.classify ?? classifyPostCategory;

  if (input.categorySelection !== AI_AUTO_CATEGORY) {
    const category = isPostCategory(input.categorySelection)
      ? input.categorySelection
      : "其他";

    return {
      category,
      categorySource: "manual",
      aiCategoryConfidence: null,
      aiCategoryReason: null,
    };
  }

  const result = await classify(input.title, input.content);

  if (result.ok && isPostCategory(result.category)) {
    return {
      category: result.category,
      categorySource: "ai",
      aiCategoryConfidence: result.confidence,
      aiCategoryReason: result.reason,
    };
  }

  return {
    category: "其他",
    categorySource: "ai_fallback",
    aiCategoryConfidence: null,
    aiCategoryReason: result.ok ? "invalid_ai_category" : result.error,
  };
}
