import { describe, it, expect } from "vitest";
import { ToolRunner } from "@/lib/tools/runner";
import { tools } from "@/lib/tools/registry";
import { githubSnapshot } from "@/fixtures/github-snapshot";

const REPO = "cash-codes/checkout-service";

function runner() {
  return new ToolRunner({
    mode: "snapshot",
    tools,
    snapshot: githubSnapshot,
    ctx: {},
  });
}

describe("snapshot integration: github tools via runner", () => {
  it("get_recent_prs returns 10 prs with #142 and #138 present", async () => {
    const prs = (await runner().run("get_recent_prs", {
      repo: REPO,
      limit: 20,
    })) as Array<{ number: number; title: string }>;
    expect(prs).toHaveLength(10);
    const numbers = prs.map((p) => p.number);
    expect(numbers).toContain(142);
    expect(numbers).toContain(138);
  });

  it("get_pr_diff(#142) mentions prepared-statement removal", async () => {
    const diff = (await runner().run("get_pr_diff", {
      repo: REPO,
      pr_id: 142,
    })) as string;
    expect(diff).toContain("prepared");
    expect(diff).toContain("getUser");
  });

  it("get_pr_diff(#138) mentions redis cache", async () => {
    const diff = (await runner().run("get_pr_diff", {
      repo: REPO,
      pr_id: 138,
    })) as string;
    expect(diff.toLowerCase()).toContain("redis");
    expect(diff).toContain("TTL_SECONDS");
  });

  it("get_pr_comments(#142) flags the prepared-statement perf concern", async () => {
    const comments = (await runner().run("get_pr_comments", {
      repo: REPO,
      pr_id: 142,
    })) as Array<{ body: string }>;
    expect(comments.length).toBeGreaterThan(0);
    expect(comments.some((c) => /prepared-statement/i.test(c.body))).toBe(true);
  });

  it("get_commit_history returns merged commits for #142 and #138", async () => {
    const commits = (await runner().run("get_commit_history", {
      repo: REPO,
      since: "2026-05-01T00:00:00Z",
    })) as Array<{ commit: { message: string } }>;
    const messages = commits.map((c) => c.commit.message);
    expect(messages.some((m) => m.includes("#142"))).toBe(true);
    expect(messages.some((m) => m.includes("#138"))).toBe(true);
  });

  it("snapshot matching is canonical: differently-ordered keys still match", async () => {
    const prs = (await runner().run("get_recent_prs", {
      limit: 20,
      repo: REPO,
    })) as Array<unknown>;
    expect(prs.length).toBe(10);
  });
});
