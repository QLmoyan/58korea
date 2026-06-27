import type { Post } from "@/lib/data/posts";
import { isMerchantPost } from "./identify";

function postTimestamp(post: Post): number {
  if (post.createdAt) {
    return new Date(post.createdAt).getTime();
  }

  return post.id;
}

function sortByNewest(a: Post, b: Post): number {
  return postTimestamp(b) - postTimestamp(a);
}

/** Pin verified merchant posts to the top; preserve recency within each group. */
export function sortPostsWithMerchantsFirst(posts: Post[]): Post[] {
  const merchantPosts: Post[] = [];
  const regularPosts: Post[] = [];

  for (const post of posts) {
    if (isMerchantPost({ author: post.author, authorId: post.authorId })) {
      merchantPosts.push(post);
    } else {
      regularPosts.push(post);
    }
  }

  merchantPosts.sort(sortByNewest);
  regularPosts.sort(sortByNewest);

  return [...merchantPosts, ...regularPosts];
}
