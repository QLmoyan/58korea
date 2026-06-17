"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Post, PostDistance } from "@/lib/data/posts";
import {
  fetchCommentsByPostId,
  fetchPosts,
  insertComment,
  insertPost,
} from "@/lib/supabase/queries";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  ANONYMOUS_NAMES,
  type Comment,
  type CreatePostInput,
  publishCategoryMap,
} from "@/lib/types/community";

interface PostStoreValue {
  posts: Post[];
  comments: Comment[];
  hydrated: boolean;
  addPost: (input: CreatePostInput) => Promise<Post>;
  addComment: (postId: number, content: string) => Promise<Comment>;
  loadCommentsForPost: (postId: number) => Promise<void>;
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

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function PostStoreProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialPosts() {
      if (!isSupabaseConfigured()) {
        setHydrated(true);
        return;
      }

      try {
        const data = await fetchPosts();
        if (!cancelled) {
          setPosts(data);
        }
      } catch (error) {
        console.error("Failed to load posts:", error);
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    loadInitialPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  const addPost = useCallback(async (input: CreatePostInput) => {
    const imageSeed = Date.now();
    const newPost = await insertPost({
      title: input.title.trim(),
      content: input.content.trim(),
      author: "我",
      location: "首尔",
      distance: randomItem(distances),
      likes: 0,
      category: publishCategoryMap[input.category],
      image_url: `https://picsum.photos/seed/post-${imageSeed}/400/480`,
      image_height: 160 + (imageSeed % 5) * 20,
      nearby: true,
      following: false,
    });

    setPosts((current) => [newPost, ...current]);
    return newPost;
  }, []);

  const loadCommentsForPost = useCallback(async (postId: number) => {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const data = await fetchCommentsByPostId(postId);
      setComments((current) => {
        const others = current.filter((comment) => comment.postId !== postId);
        return [...others, ...data];
      });
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  }, []);

  const addComment = useCallback(async (postId: number, content: string) => {
    const newComment = await insertComment({
      post_id: postId,
      author: randomItem(ANONYMOUS_NAMES),
      content: content.trim(),
    });

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
      loadCommentsForPost,
      getPostById,
      getCommentsByPostId,
    }),
    [
      posts,
      comments,
      hydrated,
      addPost,
      addComment,
      loadCommentsForPost,
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
