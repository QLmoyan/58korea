"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Post, PostDistance, PostImage } from "@/lib/data/posts";
import { resolveAuthorNameFromAuth } from "@/lib/auth/author";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  attachPostImagesAction,
  publishCommentAction,
  publishPostAction,
} from "@/lib/actions/publish-content";
import {
  fetchCommentsByPostId,
  fetchPostById,
  fetchPostImagesByPostId,
  fetchPosts,
  deleteCommentById,
  deletePostById,
} from "@/lib/supabase/queries";
import {
  removePostImagesFromStorage,
  uploadPostImagesToStorage,
  uploadCommentImage,
} from "@/lib/supabase/storage";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  isOwnedComment,
  isOwnedPost,
  markOwnedComment,
  markOwnedPost,
  unmarkOwnedComment,
  unmarkOwnedPost,
} from "@/lib/local/owned-content";
import { createClientId } from "@/lib/utils/create-client-id";
import { compressImage, compressImages } from "@/lib/utils/compress-image";
import {
  type AddCommentInput,
  type Comment,
  type CreatePostInput,
  publishCategoryMap,
} from "@/lib/types/community";

interface PostStoreValue {
  posts: Post[];
  comments: Comment[];
  hydrated: boolean;
  addPost: (input: CreatePostInput) => Promise<{ post: Post; notice?: string }>;
  addComment: (
    postId: number,
    input: AddCommentInput,
  ) => Promise<{ comment: Comment; notice?: string }>;
  loadCommentsForPost: (postId: number) => Promise<void>;
  loadPostImagesForPost: (postId: number) => Promise<PostImage[]>;
  syncPostById: (postId: number) => Promise<void>;
  getPostById: (id: number) => Post | undefined;
  getPostImagesByPostId: (postId: number) => PostImage[];
  getCommentsByPostId: (postId: number) => Comment[];
  canDeletePost: (postId: number) => boolean;
  canDeleteComment: (commentId: string) => boolean;
  deletePost: (postId: number) => Promise<void>;
  deleteComment: (postId: number, commentId: string) => Promise<void>;
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
  const { user, profile } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [postImagesByPostId, setPostImagesByPostId] = useState<
    Record<number, PostImage[]>
  >({});
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
    const author = resolveAuthorNameFromAuth(user, profile);
    const result = await publishPostAction({
      title: input.title.trim(),
      content: input.content.trim(),
      author,
      location: "首尔",
      distance: randomItem(distances),
      category: publishCategoryMap[input.category],
      nearby: true,
      following: false,
    });

    markOwnedPost(result.post.id);

    const images = input.images ?? [];
    let uploadedStoragePaths: string[] = [];

    try {
      if (images.length > 0) {
        const compressedImages = await compressImages(images.slice(0, 9));
        const drafts = await uploadPostImagesToStorage(
          result.post.id,
          compressedImages,
        );
        uploadedStoragePaths = drafts.map((draft) => draft.storagePath);

        await attachPostImagesAction({
          postId: result.post.id,
          author,
          images: drafts.map((draft) => ({
            storagePath: draft.storagePath,
            sortOrder: draft.sortOrder,
          })),
        });
      }
    } catch (error) {
      if (uploadedStoragePaths.length > 0) {
        await removePostImagesFromStorage(uploadedStoragePaths).catch(
          (cleanupError) => {
            console.error("Failed to cleanup uploaded post images:", cleanupError);
          },
        );
      }

      throw error;
    }

    if (!result.visible) {
      return {
        post: result.post,
        notice: result.notice,
      };
    }

    const savedPost = (await fetchPostById(result.post.id)) ?? result.post;
    const savedImages = savedPost.images ?? [];

    setPostImagesByPostId((current) => ({
      ...current,
      [savedPost.id]: savedImages,
    }));
    setPosts((current) => [
      savedPost,
      ...current.filter((post) => post.id !== savedPost.id),
    ]);

    return {
      post: savedPost,
      notice: result.notice,
    };
  }, [user, profile]);

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

  const loadPostImagesForPost = useCallback(async (postId: number) => {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const images = await fetchPostImagesByPostId(postId);
      setPostImagesByPostId((current) => ({
        ...current,
        [postId]: images,
      }));
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                images,
                imageUrl: images[0]?.url ?? post.imageUrl,
                imageHeight: images[0]?.height ?? post.imageHeight,
              }
            : post,
        ),
      );
      return images;
    } catch (error) {
      console.error("Failed to load post images:", error);
      return [];
    }
  }, []);

  const syncPostById = useCallback(async (postId: number) => {
    const updated = await fetchPostById(postId);

    setPosts((current) => {
      if (!updated) {
        return current.filter((post) => post.id !== postId);
      }

      const exists = current.some((post) => post.id === postId);
      if (!exists) {
        return current;
      }

      return current.map((post) => (post.id === postId ? updated : post));
    });
  }, []);

  const addComment = useCallback(
    async (postId: number, input: AddCommentInput) => {
      const author = resolveAuthorNameFromAuth(user, profile);
      const commentId = createClientId();
      let imageUrl: string | null = null;
      let imageStoragePath: string | null = null;

      if (input.image) {
        const compressedImage = await compressImage(input.image);
        const uploaded = await uploadCommentImage(commentId, compressedImage);
        imageUrl = uploaded.publicUrl;
        imageStoragePath = uploaded.storagePath;
      }

      const result = await publishCommentAction({
        id: commentId,
        postId,
        author,
        content: input.content.trim(),
        parentId: input.reply?.parentId ?? null,
        replyToAuthor: input.reply?.replyToAuthor ?? null,
        imageUrl,
        imageStoragePath,
      });

      markOwnedComment(result.comment.id);

      if (!result.visible) {
        return {
          comment: result.comment,
          notice: result.notice,
        };
      }

      setComments((current) => [...current, result.comment]);
      return {
        comment: result.comment,
        notice: result.notice,
      };
    },
    [user, profile],
  );

  const getPostById = useCallback(
    (id: number) => posts.find((post) => post.id === id),
    [posts],
  );

  const getPostImagesByPostId = useCallback(
    (postId: number) => postImagesByPostId[postId] ?? [],
    [postImagesByPostId],
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

  const canDeletePost = useCallback(
    (postId: number) => isOwnedPost(postId),
    [],
  );

  const canDeleteComment = useCallback(
    (commentId: string) => isOwnedComment(commentId),
    [],
  );

  const deletePost = useCallback(async (postId: number) => {
    await deletePostById(postId);

    setPosts((current) => current.filter((post) => post.id !== postId));
    setComments((current) =>
      current.filter((comment) => comment.postId !== postId),
    );
    setPostImagesByPostId((current) => {
      const next = { ...current };
      delete next[postId];
      return next;
    });
    unmarkOwnedPost(postId);
  }, []);

  const deleteComment = useCallback(
    async (postId: number, commentId: string) => {
      await deleteCommentById(commentId);

      setComments((current) =>
        current.filter(
          (comment) =>
            comment.postId !== postId ||
            (comment.id !== commentId && comment.parentId !== commentId),
        ),
      );
      unmarkOwnedComment(commentId);
    },
    [],
  );

  const value = useMemo(
    () => ({
      posts,
      comments,
      hydrated,
      addPost,
      addComment,
      loadCommentsForPost,
      loadPostImagesForPost,
      syncPostById,
      getPostById,
      getPostImagesByPostId,
      getCommentsByPostId,
      canDeletePost,
      canDeleteComment,
      deletePost,
      deleteComment,
    }),
    [
      posts,
      comments,
      hydrated,
      addPost,
      addComment,
      loadCommentsForPost,
      loadPostImagesForPost,
      syncPostById,
      getPostById,
      getPostImagesByPostId,
      getCommentsByPostId,
      canDeletePost,
      canDeleteComment,
      deletePost,
      deleteComment,
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
