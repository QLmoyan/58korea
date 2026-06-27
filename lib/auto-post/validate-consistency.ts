import { containsAnyKeyword, extractKeywords, keywordMatches, keywordsOverlap } from "./keywords";
import type { AutoPostTemplate } from "./types";

export interface ConsistencyResult {
  ok: boolean;
  titleKeywords: string[];
  contentKeywords: string[];
  imageKeyword: string | null;
  reason?: string;
}

function isAllowedImageKeyword(template: AutoPostTemplate, imageKeyword: string): boolean {
  const normalized = imageKeyword.toLowerCase();

  if (
    template.forbiddenImageKeywords.some((forbidden) =>
      normalized.includes(forbidden.toLowerCase()),
    )
  ) {
    return false;
  }

  return template.allowedImageKeywords.some((allowed) =>
    keywordMatches(allowed, imageKeyword),
  );
}

function titleContentAligned(
  titleKeywords: string[],
  contentKeywords: string[],
  template: AutoPostTemplate,
): boolean {
  const titleHasTopic = containsAnyKeyword(
    template.title,
    template.topicKeywords,
  );
  const contentHasTopic = containsAnyKeyword(
    template.content,
    template.topicKeywords,
  );

  if (!titleHasTopic || !contentHasTopic) {
    return false;
  }

  const titleTopicTokens = titleKeywords.filter((token) =>
    template.topicKeywords.some((topic) => keywordMatches(topic, token)),
  );
  const contentTopicTokens = contentKeywords.filter((token) =>
    template.topicKeywords.some((topic) => keywordMatches(topic, token)),
  );

  if (titleTopicTokens.length === 0 || contentTopicTokens.length === 0) {
    return false;
  }

  return (
    keywordsOverlap(titleTopicTokens, contentTopicTokens) ||
    keywordsOverlap(titleTopicTokens, template.topicKeywords.map((k) => k.toLowerCase())) ||
    keywordsOverlap(contentTopicTokens, template.topicKeywords.map((k) => k.toLowerCase()))
  );
}

export function validateAutoPostConsistency(
  template: AutoPostTemplate,
  imageKeyword: string | null,
): ConsistencyResult {
  const titleKeywords = extractKeywords(template.title);
  const contentKeywords = extractKeywords(template.content);

  if (!titleContentAligned(titleKeywords, contentKeywords, template)) {
    return {
      ok: false,
      titleKeywords,
      contentKeywords,
      imageKeyword,
      reason: "标题与正文关键词不一致",
    };
  }

  if (!imageKeyword) {
    return {
      ok: true,
      titleKeywords,
      contentKeywords,
      imageKeyword: null,
    };
  }

  if (!isAllowedImageKeyword(template, imageKeyword)) {
    return {
      ok: false,
      titleKeywords,
      contentKeywords,
      imageKeyword,
      reason: "图片关键词与帖子主题不匹配",
    };
  }

  const imageAlignedWithText =
    template.allowedImageKeywords.some((allowed) =>
      keywordMatches(allowed, imageKeyword),
    ) &&
    (containsAnyKeyword(template.title, template.topicKeywords) ||
      titleKeywords.some((token) =>
        template.allowedImageKeywords.some((allowed) => keywordMatches(allowed, token)),
      ));

  if (!imageAlignedWithText) {
    return {
      ok: false,
      titleKeywords,
      contentKeywords,
      imageKeyword,
      reason: "标题/正文与图片关键词三者不一致",
    };
  }

  return {
    ok: true,
    titleKeywords,
    contentKeywords,
    imageKeyword,
  };
}
