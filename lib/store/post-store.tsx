"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  posts as seedPosts,
  type Post,
  type PostDistance,
} from "@/lib/data/posts";
import {
  ANONYMOUS_NAMES,
  type Comment,
  type CreatePostInput,
  publishCategoryMap,
  STORAGE_COMMENTS_KEY,
  STORAGE_POSTS_KEY,
} from "@/lib/types/community";

interface PostStoreValue {
  posts: Post[];
  comments: Comment[];
  hydrated: boolean;
  addPost: (input: CreatePostInput) => Post;
  addComment: (postId: number, content: string) => Comment;
  getPostById: (id: number) => Post | undefined;
  getCommentsByPostId: (postId: number) => Comment[];
}

const PostStoreContext = createContext<PostStoreValue | null>(null);

const distances: PostDistance[] = [
  "100m",
  "350m",
  "800m",
  "1.2km",
  "2.4km",
  "3.8km",
];

function enrichSeedPosts(data: Post[]): Post[] {
  return data.map((post) => ({
    ...post,
    content:
      post.content ||
      `${post.title}\n\n这是帖子详情内容。欢迎在下方留言交流，了解更多信息。`,
    createdAt: post.createdAt || new Date().toISOString(),
  }));
}

function loadPosts(): Post[] {
  if (typeof window === "undefined") {
    return enrichSeedPosts(seedPosts);
  }

  const saved = localStorage.getItem(STORAGE_POSTS_KEY);
  if (!saved) {
    return enrichSeedPosts(seedPosts);
  }

  try {
    return JSON.parse(saved) as Post[];
  } catch {
    return enrichSeedPosts(seedPosts);
  }
}

function loadComments(): Comment[] {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = localStorage.getItem(STORAGE_COMMENTS_KEY);
  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved) as Comment[];
  } catch {
    return [];
  }
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function PostStoreProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>(() => enrichSeedPosts(seedPosts));
  const [comments, setComments] = useState<Comment[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPosts(loadPosts());
    setComments(loadComments());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(posts));
  }, [posts, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_COMMENTS_KEY, JSON.stringify(comments));
  }, [comments, hydrated]);

  const addPost = useCallback((input: CreatePostInput) => {
    const nextId =
      posts.reduce((maxId, post) => Math.max(maxId, post.id), 0) + 1;
    const distance = randomItem(distances);

    const newPost: Post = {
      id: nextId,
      title: input.title.trim(),
      content: input.content.trim(),
      author: "我",
      location: "首尔",
      distance,
      likes: 0,
      category: publishCategoryMap[input.category],
      imageUrl: `https://picsum.photos/seed/post-${nextId}/400/480`,
      imageHeight: 160 + (nextId % 5) * 20,
      nearby: true,
      following: false,
      createdAt: new Date().toISOString(),
    };

    setPosts((current) => [newPost, ...current]);
    return newPost;
  }, [posts]);

  const addComment = useCallback((postId: number, content: string) => {
    const newComment: Comment = {
      id: `${postId}-${Date.now()}`,
      postId,
      author: randomItem(ANONYMOUS_NAMES),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setComments((current) => [...current, newComment]);
    return newComment;
  }, []);

  const getPostById = useCallback(
    (id: number) => posts.find((post) => post.id === id),
    [posts],
  );

  const getCommentsByPostId = useCallback(
    (postId: number) =>
      comments
        .filter((comment) => comment.postId === postId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [comments],
  );

  const value = useMemo(
    () => ({
      posts,
      comments,
      hydrated,
      addPost,
      addComment,
      getPostById,
      getCommentsByPostId,
    }),
    [
      posts,
      comments,
      hydrated,
      addPost,
      addComment,
      getPostById,
      getCommentsByPostId,
    ],
  );

  return (
    <PostStoreContext.Provider value={value}>{children}</PostStoreContext.Provider>
  );
}

export function usePostStore() {
  const context = useContext(PostStoreContext);
  if (!context) {
    throw new Error("usePostStore must be used within PostStoreProvider");
  }
  return context;
}
