import type { Snapshot } from "@/lib/tools/types";

/**
 * Synthetic GitHub data for the demo investigation:
 *   "Recent PRs caused performance regressions."
 *
 * The two plausible culprits are:
 *   - PR #142  "Refactor user query for performance"      (DB change - original conclusion)
 *   - PR #138  "Add Redis caching layer for product catalog" (caching change - fork conclusion)
 *
 * Other PRs are intentionally innocuous so the agent has noise to filter through.
 */
const REPO = "cash-codes/checkout-service";

export const githubSnapshot: Snapshot = {
  get_recent_prs: [
    {
      arguments: { repo: REPO, limit: 20 },
      result: [
        {
          number: 145,
          title: "Update README badges",
          body: "Add CI and coverage badges.",
          state: "closed",
          user: { login: "alice" },
          created_at: "2026-05-08T10:00:00Z",
          head: { sha: "sha-145" },
          base: { sha: "main-1" },
        },
        {
          number: 144,
          title: "Bump dependencies",
          body: "Routine dependency bumps; no functional changes.",
          state: "closed",
          user: { login: "bob" },
          created_at: "2026-05-07T14:32:00Z",
          head: { sha: "sha-144" },
          base: { sha: "main-1" },
        },
        {
          number: 143,
          title: "Fix typo in checkout error message",
          body: "Trivial copy fix.",
          state: "closed",
          user: { login: "carol" },
          created_at: "2026-05-07T09:11:00Z",
          head: { sha: "sha-143" },
          base: { sha: "main-1" },
        },
        {
          number: 142,
          title: "Refactor user query for performance",
          body: "Inlines the user-lookup join, removes the cached prepared-statement path and switches to a single composed SELECT. Should be faster on cold cache.",
          state: "closed",
          user: { login: "dave" },
          created_at: "2026-05-06T17:45:00Z",
          head: { sha: "sha-142" },
          base: { sha: "main-1" },
        },
        {
          number: 141,
          title: "Refactor order processing pipeline",
          body: "Splits the order-processing module into smaller services.",
          state: "closed",
          user: { login: "eve" },
          created_at: "2026-05-06T11:20:00Z",
          head: { sha: "sha-141" },
          base: { sha: "main-1" },
        },
        {
          number: 140,
          title: "Add metrics dashboard config",
          body: "Adds Grafana dashboard JSON for tracking p95 latency.",
          state: "closed",
          user: { login: "alice" },
          created_at: "2026-05-05T16:00:00Z",
          head: { sha: "sha-140" },
          base: { sha: "main-1" },
        },
        {
          number: 139,
          title: "Remove dead code in legacy adapter",
          body: "Deletes unused fallback path.",
          state: "closed",
          user: { login: "bob" },
          created_at: "2026-05-05T10:00:00Z",
          head: { sha: "sha-139" },
          base: { sha: "main-1" },
        },
        {
          number: 138,
          title: "Add Redis caching layer for product catalog",
          body: "Introduces a Redis-backed cache for product-catalog reads with a 5-minute TTL. Cache-miss path falls back to Postgres.",
          state: "closed",
          user: { login: "carol" },
          created_at: "2026-05-04T13:15:00Z",
          head: { sha: "sha-138" },
          base: { sha: "main-1" },
        },
        {
          number: 137,
          title: "Update CI workflow",
          body: "Bumps Node version in CI.",
          state: "closed",
          user: { login: "dave" },
          created_at: "2026-05-04T09:00:00Z",
          head: { sha: "sha-137" },
          base: { sha: "main-1" },
        },
        {
          number: 136,
          title: "Documentation updates",
          body: "Misc doc improvements.",
          state: "closed",
          user: { login: "eve" },
          created_at: "2026-05-03T17:00:00Z",
          head: { sha: "sha-136" },
          base: { sha: "main-1" },
        },
      ],
    },
  ],

  get_pr_diff: [
    {
      arguments: { repo: REPO, pr_id: 142 },
      result: `diff --git a/src/queries/user.ts b/src/queries/user.ts
index 1a2b3c4..5d6e7f8 100644
--- a/src/queries/user.ts
+++ b/src/queries/user.ts
@@ -1,18 +1,12 @@
-import { pool, prepared } from "./db";
+import { pool } from "./db";

-const getUserStmt = prepared(
-  "SELECT u.* FROM users u WHERE u.id = $1"
-);
-
 export async function getUser(id: string) {
-  return getUserStmt.get(id);
+  const { rows } = await pool.query(
+    \`SELECT u.id, u.email, u.created_at,
+            o.id AS order_id, o.total
+     FROM users u
+     LEFT JOIN orders o ON o.user_id = u.id
+     WHERE u.id = $1\`,
+    [id]
+  );
+  return rows;
 }
`,
    },
    {
      arguments: { repo: REPO, pr_id: 138 },
      result: `diff --git a/src/cache/catalog.ts b/src/cache/catalog.ts
new file mode 100644
index 0000000..a1b2c3d
--- /dev/null
+++ b/src/cache/catalog.ts
@@ -0,0 +1,24 @@
+import { redis } from "../redis";
+import { fetchCatalogFromDb } from "../db/catalog";
+
+const TTL_SECONDS = 300;
+
+export async function getCatalog(key: string) {
+  const cached = await redis.get(\`catalog:\${key}\`);
+  if (cached) return JSON.parse(cached);
+  const fresh = await fetchCatalogFromDb(key);
+  await redis.setex(\`catalog:\${key}\`, TTL_SECONDS, JSON.stringify(fresh));
+  return fresh;
+}
`,
    },
    {
      arguments: { repo: REPO, pr_id: 144 },
      result: `diff --git a/package.json b/package.json
index 1111111..2222222 100644
--- a/package.json
+++ b/package.json
@@ -10,7 +10,7 @@
   "dependencies": {
-    "express": "4.18.2",
+    "express": "4.19.0",
   }
`,
    },
    {
      arguments: { repo: REPO, pr_id: 145 },
      result: `diff --git a/README.md b/README.md
index aaaaaaa..bbbbbbb 100644
--- a/README.md
+++ b/README.md
@@ -1,3 +1,5 @@
 # checkout-service
+
+![CI](badges/ci.svg) ![Coverage](badges/cov.svg)
`,
    },
    {
      arguments: { repo: REPO, pr_id: 143 },
      result: `diff --git a/src/checkout/errors.ts b/src/checkout/errors.ts
index ccccccc..ddddddd 100644
--- a/src/checkout/errors.ts
+++ b/src/checkout/errors.ts
@@ -12,7 +12,7 @@ export function paymentFailed(reason: string) {
-  throw new Error(\`Payement failed: \${reason}\`);
+  throw new Error(\`Payment failed: \${reason}\`);
 }
`,
    },
    {
      arguments: { repo: REPO, pr_id: 141 },
      result: `diff --git a/src/order/processor.ts b/src/order/services/processor.ts
similarity index 100%
rename from src/order/processor.ts
rename to src/order/services/processor.ts
`,
    },
    {
      arguments: { repo: REPO, pr_id: 140 },
      result: `diff --git a/grafana/dashboards/p95-latency.json b/grafana/dashboards/p95-latency.json
new file mode 100644
index 0000000..eeeeeee
--- /dev/null
+++ b/grafana/dashboards/p95-latency.json
@@ -0,0 +1,3 @@
+{
+  "title": "p95 latency by endpoint", "panels": []
+}
`,
    },
    {
      arguments: { repo: REPO, pr_id: 139 },
      result: `diff --git a/src/legacy/adapter.ts b/src/legacy/adapter.ts
index fffffff..ggggggg 100644
--- a/src/legacy/adapter.ts
+++ b/src/legacy/adapter.ts
@@ -42,18 +42,0 @@ export class LegacyAdapter {
-  // Fallback path for old API version - unused since 2025.
-  private legacyV1Fallback(req: Request) {
-    // ...18 lines deleted...
-  }
 }
`,
    },
    {
      arguments: { repo: REPO, pr_id: 137 },
      result: `diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index hhhhhhh..iiiiiii 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -10,7 +10,7 @@ jobs:
     - uses: actions/setup-node@v4
       with:
-        node-version: 20
+        node-version: 22
`,
    },
    {
      arguments: { repo: REPO, pr_id: 136 },
      result: `diff --git a/docs/setup.md b/docs/setup.md
index jjjjjjj..kkkkkkk 100644
--- a/docs/setup.md
+++ b/docs/setup.md
@@ -5,4 +5,4 @@ Prerequisites: Node 20+.
-Clone the repo and run \`pnpm install\`.
+Clone the repo and run \`npm install\`.
`,
    },
  ],

  get_pr_comments: [
    {
      arguments: { repo: REPO, pr_id: 142 },
      result: [
        {
          id: 9001,
          user: { login: "reviewer-1" },
          body: "Removing the prepared-statement path will mean every query re-plans on Postgres. On hot paths under load this can show up as elevated p95.",
          created_at: "2026-05-06T18:01:00Z",
        },
        {
          id: 9002,
          user: { login: "dave" },
          body: "Good point, but Postgres plan cache should handle it for repeated queries.",
          created_at: "2026-05-06T18:30:00Z",
        },
      ],
    },
    {
      arguments: { repo: REPO, pr_id: 138 },
      result: [
        {
          id: 9101,
          user: { login: "reviewer-2" },
          body: "Watch the 5-minute TTL. If catalog updates need to be visible faster, this will surface as confusing reads.",
          created_at: "2026-05-04T13:45:00Z",
        },
        {
          id: 9102,
          user: { login: "carol" },
          body: "Acknowledged. Adding a cache-bust hook in a follow-up.",
          created_at: "2026-05-04T14:00:00Z",
        },
      ],
    },
    // Innocuous PRs have no review discussion of note - empty arrays so the
    // live agent's get_pr_comments calls succeed during fork exploration.
    { arguments: { repo: REPO, pr_id: 145 }, result: [] },
    { arguments: { repo: REPO, pr_id: 144 }, result: [] },
    { arguments: { repo: REPO, pr_id: 143 }, result: [] },
    { arguments: { repo: REPO, pr_id: 141 }, result: [] },
    { arguments: { repo: REPO, pr_id: 140 }, result: [] },
    { arguments: { repo: REPO, pr_id: 139 }, result: [] },
    { arguments: { repo: REPO, pr_id: 137 }, result: [] },
    { arguments: { repo: REPO, pr_id: 136 }, result: [] },
  ],

  get_commit_history: [
    {
      arguments: { repo: REPO, since: "2026-05-01T00:00:00Z" },
      result: [
        {
          sha: "main-145",
          commit: {
            message: "Update README badges (#145)",
            author: { name: "alice", date: "2026-05-08T10:30:00Z" },
          },
        },
        {
          sha: "main-142",
          commit: {
            message: "Refactor user query for performance (#142)",
            author: { name: "dave", date: "2026-05-06T18:45:00Z" },
          },
        },
        {
          sha: "main-138",
          commit: {
            message: "Add Redis caching layer for product catalog (#138)",
            author: { name: "carol", date: "2026-05-04T14:15:00Z" },
          },
        },
      ],
    },
  ],
};
