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
import { sortPostsWithMerchantsFirst } from "@/lib/merchant/sort-posts";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  togglePostFavoriteAction,
  togglePostLikeAction,
} from "@/lib/actions/post-engagement";
import { recordPostViewAction } from "@/lib/actions/post-views";
import {
  fetchFavoritedPosts,
  fetchUserFavoritedPostIds,
  fetchUserLikedPostIds,
} from "@/lib/supabase/engagement-queries";
import { fetchViewedPosts, type ViewedPostEntry } from "@/lib/supabase/view-queries";
import {
  attachCommentImagesAction,
  attachPostImagesAction,
  deleteCommentAction,
  publishCommentAction,
  publishPostAction,
} from "@/lib/actions/publish-content";
import {
  fetchCommentsByPostId,
  fetchPostById,
  fetchPostImagesByPostId,
  fetchPosts,
} from "@/lib/supabase/queries";
import { deleteOwnedPostAction } from "@/lib/actions/delete-post";
import {
  removePostImagesFromStorage,
  uploadCommentImagesToStorage,
  uploadPostImagesToStorage,
} from "@/lib/supabase/storage";
import { MAX_COMMENT_IMAGES } from "@/lib/comments/comment-images";
import { CLIENT_FETCH_TIMEOUT_MS } from "@/lib/constants/network";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { logClientError } from "@/lib/utils/log-client-error";
import { withTimeout } from "@/lib/utils/with-timeout";
import {
  isOwnedComment,
  isOwnedPost,
  markOwnedComment,
  markOwnedPost,
  unmarkOwnedComment,
  unmarkOwnedPost,
} from "@/lib/local/owned-content";
import { createClientId } from "@/lib/utils/create-client-id";
import { compressImages } from "@/lib/utils/compress-image";
import {
  type AddCommentInput,
  type Comment,
  type CreatePostInput,
} from "@/lib/types/community";

interface PostStoreValue {
  posts: Post[];
  comments: Comment[];
  hydrated: boolean;
  feedError: string | null;
  engagementHydrated: boolean;
  favoritePosts: Post[];
  historyPosts: ViewedPostEntry[];
  isPostLiked: (postId: number) => boolean;
  isPostFavorited: (postId: number) => boolean;
  toggleLike: (postId: number) => Promise<void>;
  toggleFavorite: (postId: number) => Promise<void>;
  refreshFavoritePosts: () => Promise<void>;
  recordPostView: (postId: number) => Promise<void>;
  refreshHistoryPosts: () => Promise<void>;
  syncAuthorInFeed: (previousAuthor: string, nextAuthor: string) => void;
  addPost: (input: CreatePostInput) => Promise<{ post: Post; notice?: string }>;
  addComment: (
    postId: number,
    input: AddCommentInput,
  ) => Promise<{ comment: Comment; notice?: string }>;
  loadCommentsForPost: (postId: number) => Promise<void>;
  loadPostImagesForPost: (postId: number) => Promise<PostImage[]>;
  syncPostById: (postId: number) => Promise<Post | null>;
  getPostById: (id: number) => Post | undefined;
  getPostImagesByPostId: (postId: number) => PostImage[];
  getCommentsByPostId: (postId: number) => Comment[];
  canDeletePost: (postId: number) => boolean;
  canDeleteComment: (commentId: string) => boolean;
  deletePost: (postId: number) => Promise<void>;
  deleteComment: (postId: number, commentId: string) => Promise<void>;
  reloadFeed: () => void;
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
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedAttempt, setFeedAttempt] = useState(0);
  const [engagementHydrated, setEngagementHydrated] = useState(false);
  const [likedPostIds, setLikedPostIds] = useState<Set<number>>(new Set());
  const [favoritedPostIds, setFavoritedPostIds] = useState<Set<number>>(
    new Set(),
  );
  const [favoritePosts, setFavoritePosts] = useState<Post[]>([]);
  const [historyPosts, setHistoryPosts] = useState<ViewedPostEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    const safetyTimer = window.setTimeout(() => {
      if (!cancelled) {
        logClientError("posts.feed.safety", new Error("Feed init safety timeout"));
        setHydrated(true);
        setFeedError((current) => current ?? "帖子加载超时，请检查网络后重试");
      }
    }, CLIENT_FETCH_TIMEOUT_MS + 2_000);

    async function loadInitialPosts() {
      if (!isSupabaseConfigured()) {
        setFeedError(null);
        setHydrated(true);
        return;
      }

      setFeedError(null);

      try {
        const data = await withTimeout(
          fetchPosts(),
          CLIENT_FETCH_TIMEOUT_MS,
          "帖子加载超时",
        );
        if (!cancelled) {
          setPosts(data);
        }
      } catch (error) {
        logClientError("posts.feed", error);
        if (!cancelled) {
          setFeedError(
            error instanceof Error
              ? error.message
              : "帖子加载失败，请检查网络后重试",
          );
        }
      } finally {
        window.clearTimeout(safetyTimer);
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    loadInitialPosts();

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
    };
  }, [feedAttempt]);

  const reloadFeed = useCallback(() => {
    setHydrated(false);
    setFeedAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadEngagement() {
      if (!user?.id || !isSupabaseConfigured()) {
        setLikedPostIds(new Set());
        setFavoritedPostIds(new Set());
        setFavoritePosts([]);
        setHistoryPosts([]);
        setEngagementHydrated(true);
        return;
      }

      setEngagementHydrated(false);

      try {
        const [likedIds, favoritedIds, favorites, history] = await withTimeout(
          Promise.all([
            fetchUserLikedPostIds(user.id),
            fetchUserFavoritedPostIds(user.id),
            fetchFavoritedPosts(user.id),
            fetchViewedPosts(user.id),
          ]),
          CLIENT_FETCH_TIMEOUT_MS,
          "互动数据加载超时",
        );

        if (!cancelled) {
          setLikedPostIds(new Set(likedIds));
          setFavoritedPostIds(new Set(favoritedIds));
          setFavoritePosts(favorites);
          setHistoryPosts(history);
        }
      } catch (error) {
        logClientError("posts.engagement", error, { userId: user.id });
      } finally {
        if (!cancelled) {
          setEngagementHydrated(true);
        }
      }
    }

    loadEngagement();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isPostLiked = useCallback(
    (postId: number) => likedPostIds.has(postId),
    [likedPostIds],
  );

  const isPostFavorited = useCallback(
    (postId: number) => favoritedPostIds.has(postId),
    [favoritedPostIds],
  );

  const refreshFavoritePosts = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      setFavoritePosts([]);
      return;
    }

    try {
      const favorites = await fetchFavoritedPosts(user.id);
      setFavoritePosts(favorites);
      setFavoritedPostIds(new Set(favorites.map((post) => post.id)));
    } catch (error) {
      console.error("Failed to refresh favorite posts:", error);
    }
  }, [user?.id]);

  const refreshHistoryPosts = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      setHistoryPosts([]);
      return;
    }

    try {
      const history = await fetchViewedPosts(user.id);
      setHistoryPosts(history);
    } catch (error) {
      console.error("Failed to refresh history posts:", error);
    }
  }, [user?.id]);

  const recordPostView = useCallback(
    async (postId: number) => {
      if (!user?.id || !isSupabaseConfigured()) {
        return;
      }

      try {
        await recordPostViewAction(postId);

        const viewedPost =
          posts.find((post) => post.id === postId) ??
          (await fetchPostById(postId));

        if (!viewedPost) {
          await refreshHistoryPosts();
          return;
        }

        setHistoryPosts((current) => [
          { post: viewedPost, viewedAt: new Date().toISOString() },
          ...current.filter((entry) => entry.post.id !== postId),
        ]);
      } catch (error) {
        console.error("Failed to record post view:", error);
      }
    },
    [user?.id, posts, refreshHistoryPosts],
  );

  const toggleLike = useCallback(async (postId: number) => {
    const result = await togglePostLikeAction(postId);

    setLikedPostIds((current) => {
      const next = new Set(current);
      if (result.liked) {
        next.add(postId);
      } else {
        next.delete(postId);
      }
      return next;
    });

    setPosts((current) =>
      current.map((post) =>
        post.id === postId ? { ...post, likes: result.likes } : post,
      ),
    );
  }, []);

  const toggleFavorite = useCallback(async (postId: number) => {
    let wasFavorited = false;

    setFavoritedPostIds((current) => {
      wasFavorited = current.has(postId);
      const next = new Set(current);
      if (wasFavorited) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });

    const nextFavorited = !wasFavorited;

    setFavoritePosts((current) => {
      if (!nextFavorited) {
        return current.filter((post) => post.id !== postId);
      }

      if (current.some((post) => post.id === postId)) {
        return current;
      }

      const post = posts.find((entry) => entry.id === postId);
      if (!post) {
        return current;
      }

      return [post, ...current];
    });

    try {
      const result = await togglePostFavoriteAction(postId);

      if (user?.id) {
        const favorites = await fetchFavoritedPosts(user.id);
        setFavoritePosts(favorites);
        setFavoritedPostIds(new Set(favorites.map((post) => post.id)));

        if (result.favorited !== nextFavorited) {
          return;
        }
      }
    } catch (error) {
      setFavoritedPostIds((current) => {
        const next = new Set(current);
        if (wasFavorited) {
          next.add(postId);
        } else {
          next.delete(postId);
        }
        return next;
      });

      setFavoritePosts((current) => {
        if (wasFavorited) {
          const post = posts.find((entry) => entry.id === postId);
          if (post && !current.some((entry) => entry.id === postId)) {
            return [post, ...current];
          }
          return current;
        }

        return current.filter((post) => post.id !== postId);
      });

      throw error;
    }
  }, [user?.id, posts]);

  const addPost = useCallback(async (input: CreatePostInput) => {
    const author = resolveAuthorNameFromAuth(user, profile);
    const result = await publishPostAction({
      title: input.title.trim(),
      content: input.content.trim(),
      author,
      location: "首尔",
      distance: randomItem(distances),
      categorySelection: input.categorySelection,
      nearby: true,
      following: false,
      couponBinding: input.couponBinding,
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

      const message =
        error instanceof Error ? error.message : "图片上传失败，请稍后重试";
      throw new Error(
        /图片上传失败/i.test(message)
          ? `${message}。帖子已创建，请重新编辑或再次发布图片。`
          : message,
      );
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
    setPosts((current) =>
      sortPostsWithMerchantsFirst([
        savedPost,
        ...current.filter((post) => post.id !== savedPost.id),
      ]),
    );

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
        return sortPostsWithMerchantsFirst([updated, ...current]);
      }

      return current.map((post) => (post.id === postId ? updated : post));
    });

    return updated;
  }, []);

  const addComment = useCallback(
    async (postId: number, input: AddCommentInput) => {
      const author = resolveAuthorNameFromAuth(user, profile);
      const commentId = createClientId();
      const trimmedContent = input.content.trim();

      if (!trimmedContent) {
        throw new Error("请输入留言内容");
      }

      const imageFiles = (input.images ?? []).slice(0, MAX_COMMENT_IMAGES);

      const result = await publishCommentAction({
        id: commentId,
        postId,
        author,
        content: trimmedContent,
        parentId: input.reply?.parentId ?? null,
        replyToAuthor: input.reply?.replyToAuthor ?? null,
      });

      let attachedImages = result.comment.images;

      if (imageFiles.length > 0) {
        if (!user?.id) {
          throw new Error("请先登录后再上传评论图片");
        }

        let uploadedDrafts: Awaited<
          ReturnType<typeof uploadCommentImagesToStorage>
        > = [];

        try {
          const compressedImages = await compressImages(imageFiles);
          uploadedDrafts = await uploadCommentImagesToStorage(
            user.id,
            commentId,
            compressedImages,
          );
          const attachResult = await attachCommentImagesAction({
            commentId,
            images: uploadedDrafts.map((draft) => ({
              imageUrl: draft.publicUrl,
              sortOrder: draft.sortOrder,
            })),
          });
          attachedImages = attachResult.images;
        } catch (attachError) {
          if (uploadedDrafts.length > 0) {
            await removePostImagesFromStorage(
              uploadedDrafts.map((draft) => draft.storagePath),
            ).catch((cleanupError) => {
              console.error("Failed to cleanup uploaded comment images:", cleanupError);
            });
          }
          await deleteCommentAction(commentId).catch((cleanupError) => {
            console.error("Failed to rollback comment after image attach:", cleanupError);
          });
          throw attachError;
        }
      }

      const comment = {
        ...result.comment,
        images: attachedImages,
        imageUrl: attachedImages[0]?.url ?? result.comment.imageUrl,
      };

      markOwnedComment(comment.id);

      if (!result.visible) {
        return {
          comment,
          notice: result.notice,
        };
      }

      setComments((current) => [...current, comment]);
      return {
        comment,
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

  const syncAuthorInFeed = useCallback(
    (previousAuthor: string, nextAuthor: string) => {
      if (!previousAuthor || previousAuthor === nextAuthor) {
        return;
      }

      setPosts((current) =>
        current.map((post) =>
          post.author === previousAuthor
            ? { ...post, author: nextAuthor }
            : post,
        ),
      );
      setComments((current) =>
        current.map((comment) =>
          comment.author === previousAuthor
            ? { ...comment, author: nextAuthor }
            : comment,
        ),
      );
      setFavoritePosts((current) =>
        current.map((post) =>
          post.author === previousAuthor
            ? { ...post, author: nextAuthor }
            : post,
        ),
      );
      setHistoryPosts((current) =>
        current.map((entry) =>
          entry.post.author === previousAuthor
            ? { ...entry, post: { ...entry.post, author: nextAuthor } }
            : entry,
        ),
      );
    },
    [],
  );

  const deletePost = useCallback(async (postId: number) => {
    await deleteOwnedPostAction(postId);

    setPosts((current) => current.filter((post) => post.id !== postId));
    setComments((current) =>
      current.filter((comment) => comment.postId !== postId),
    );
    setPostImagesByPostId((current) => {
      const next = { ...current };
      delete next[postId];
      return next;
    });
    setLikedPostIds((current) => {
      const next = new Set(current);
      next.delete(postId);
      return next;
    });
    setFavoritedPostIds((current) => {
      const next = new Set(current);
      next.delete(postId);
      return next;
    });
    setFavoritePosts((current) => current.filter((post) => post.id !== postId));
    setHistoryPosts((current) =>
      current.filter((entry) => entry.post.id !== postId),
    );
    unmarkOwnedPost(postId);
  }, []);

  const deleteComment = useCallback(
    async (postId: number, commentId: string) => {
      await deleteCommentAction(commentId);

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
      feedError,
      engagementHydrated,
      favoritePosts,
      historyPosts,
      isPostLiked,
      isPostFavorited,
      toggleLike,
      toggleFavorite,
      refreshFavoritePosts,
      recordPostView,
      refreshHistoryPosts,
      syncAuthorInFeed,
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
      reloadFeed,
    }),
    [
      posts,
      comments,
      hydrated,
      feedError,
      engagementHydrated,
      favoritePosts,
      historyPosts,
      isPostLiked,
      isPostFavorited,
      toggleLike,
      toggleFavorite,
      refreshFavoritePosts,
      recordPostView,
      refreshHistoryPosts,
      syncAuthorInFeed,
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
      reloadFeed,
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
