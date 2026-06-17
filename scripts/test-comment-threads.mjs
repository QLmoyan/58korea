function normalizeParentId(parentId) {
  if (!parentId || parentId === "null" || parentId === "undefined") {
    return null;
  }
  return parentId;
}

function sortByCreatedAt(a, b) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function getRootId(comment, commentById) {
  const parentId = normalizeParentId(comment.parentId);
  if (!parentId) {
    return comment.id;
  }

  const parent = commentById.get(parentId);
  if (!parent) {
    return null;
  }

  const parentParentId = normalizeParentId(parent.parentId);
  return parentParentId ?? parent.id;
}

function buildCommentThreads(comments) {
  const commentById = new Map(comments.map((comment) => [comment.id, comment]));
  const roots = comments
    .filter((comment) => !normalizeParentId(comment.parentId))
    .sort(sortByCreatedAt);
  const repliesByRoot = new Map();

  for (const comment of comments) {
    if (!normalizeParentId(comment.parentId)) {
      continue;
    }

    const rootId = getRootId(comment, commentById);
    if (!rootId || rootId === comment.id) {
      continue;
    }

    const replies = repliesByRoot.get(rootId) ?? [];
    replies.push(comment);
    repliesByRoot.set(rootId, replies);
  }

  return roots.map((root) => ({
    root: root.content,
    replies: (repliesByRoot.get(root.id) ?? []).sort(sortByCreatedAt).map((reply) => reply.content),
  }));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const now = Date.now();
const comments = [
  { id: "a", content: "A", parentId: null, createdAt: new Date(now).toISOString() },
  { id: "c", content: "C", parentId: null, createdAt: new Date(now + 1000).toISOString() },
  { id: "d", content: "D", parentId: null, createdAt: new Date(now + 2000).toISOString() },
  {
    id: "b",
    content: "B",
    parentId: "a",
    createdAt: new Date(now + 3000).toISOString(),
  },
];

const threads = buildCommentThreads(comments);

assert(threads.length === 3, `Expected 3 roots, got ${threads.length}`);
assert(threads[0].root === "A", "First root should be A");
assert(threads[0].replies.join(",") === "B", "B should reply under A");
assert(threads[1].root === "C", "Second root should be C");
assert(threads[1].replies.length === 0, "C should have no replies");
assert(threads[2].root === "D", "Third root should be D");

console.log("Comment thread layout test passed");
console.log(JSON.stringify(threads, null, 2));
