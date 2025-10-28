// src/utils/posts.js
export const EDIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function canEditPost(post, now = Date.now()) {
  if (!post) return false;
  if (!post.timestamp) return false;
  return now - post.timestamp <= EDIT_WINDOW_MS;
}
