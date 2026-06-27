const STORAGE_KEY = "58korea_owned_content";

interface OwnedContent {
  posts: number[];
  comments: string[];
}

function emptyOwnedContent(): OwnedContent {
  return { posts: [], comments: [] };
}

function readOwnedContent(): OwnedContent {
  if (typeof window === "undefined") {
    return emptyOwnedContent();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyOwnedContent();
    }

    const parsed = JSON.parse(raw) as Partial<OwnedContent>;
    return {
      posts: Array.isArray(parsed.posts)
        ? parsed.posts.filter((id): id is number => typeof id === "number")
        : [],
      comments: Array.isArray(parsed.comments)
        ? parsed.comments.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return emptyOwnedContent();
  }
}

function writeOwnedContent(data: OwnedContent): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota or privacy mode errors.
  }
}

export function getOwnedPostIds(): number[] {
  return [...readOwnedContent().posts];
}

export function getOwnedCommentIds(): string[] {
  return [...readOwnedContent().comments];
}

export function isOwnedPost(postId: number): boolean {
  return readOwnedContent().posts.includes(postId);
}

export function isOwnedComment(commentId: string): boolean {
  return readOwnedContent().comments.includes(commentId);
}

export function markOwnedPost(postId: number): void {
  const data = readOwnedContent();
  if (data.posts.includes(postId)) {
    return;
  }

  writeOwnedContent({
    ...data,
    posts: [...data.posts, postId],
  });
}

export function markOwnedComment(commentId: string): void {
  const data = readOwnedContent();
  if (data.comments.includes(commentId)) {
    return;
  }

  writeOwnedContent({
    ...data,
    comments: [...data.comments, commentId],
  });
}

export function unmarkOwnedPost(postId: number): void {
  const data = readOwnedContent();
  writeOwnedContent({
    ...data,
    posts: data.posts.filter((id) => id !== postId),
  });
}

export function unmarkOwnedComment(commentId: string): void {
  const data = readOwnedContent();
  writeOwnedContent({
    ...data,
    comments: data.comments.filter((id) => id !== commentId),
  });
}

export function clearOwnedContent(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore quota or privacy mode errors.
  }
}
