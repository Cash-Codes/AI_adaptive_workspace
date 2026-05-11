import { describe, it, expect } from "vitest";
import { getRecentPrs } from "@/lib/tools/get-recent-prs";
import { getPrDiff } from "@/lib/tools/get-pr-diff";
import { getPrComments } from "@/lib/tools/get-pr-comments";
import { getCommitHistory } from "@/lib/tools/get-commit-history";

describe("tool: get_recent_prs", () => {
  it("has the expected name and description", () => {
    expect(getRecentPrs.name).toBe("get_recent_prs");
    expect(getRecentPrs.description.length).toBeGreaterThan(0);
  });

  it("validates input: requires repo", () => {
    expect(() => getRecentPrs.inputSchema.parse({})).toThrow();
    expect(getRecentPrs.inputSchema.parse({ repo: "a/b" })).toEqual({
      repo: "a/b",
    });
  });

  it("validates input: limit is optional and numeric", () => {
    expect(
      getRecentPrs.inputSchema.parse({ repo: "a/b", limit: 5 })
    ).toEqual({ repo: "a/b", limit: 5 });
    expect(() =>
      getRecentPrs.inputSchema.parse({ repo: "a/b", limit: "5" })
    ).toThrow();
  });

  it("validates output: array of PR summaries", () => {
    const ok = [
      {
        number: 142,
        title: "x",
        body: "y",
        state: "open",
        user: { login: "alice" },
        created_at: "2026-05-09T00:00:00Z",
        head: { sha: "abc" },
        base: { sha: "def" },
      },
    ];
    expect(getRecentPrs.outputSchema.parse(ok)).toEqual(ok);
  });
});

describe("tool: get_pr_diff", () => {
  it("requires repo and numeric pr_id", () => {
    expect(() => getPrDiff.inputSchema.parse({ repo: "a/b" })).toThrow();
    expect(getPrDiff.inputSchema.parse({ repo: "a/b", pr_id: 1 })).toEqual({
      repo: "a/b",
      pr_id: 1,
    });
  });

  it("output is a string (raw diff)", () => {
    expect(getPrDiff.outputSchema.parse("diff --git a/x b/x")).toBe(
      "diff --git a/x b/x"
    );
  });
});

describe("tool: get_pr_comments", () => {
  it("requires repo and pr_id", () => {
    expect(() => getPrComments.inputSchema.parse({ repo: "a/b" })).toThrow();
  });

  it("output is an array of comments", () => {
    const ok = [
      {
        id: 1,
        user: { login: "bob" },
        body: "lgtm",
        created_at: "2026-05-09T00:00:00Z",
      },
    ];
    expect(getPrComments.outputSchema.parse(ok)).toEqual(ok);
  });
});

describe("tool: get_commit_history", () => {
  it("requires repo; since is optional ISO date string", () => {
    expect(() => getCommitHistory.inputSchema.parse({})).toThrow();
    expect(
      getCommitHistory.inputSchema.parse({ repo: "a/b" })
    ).toEqual({ repo: "a/b" });
    expect(
      getCommitHistory.inputSchema.parse({
        repo: "a/b",
        since: "2026-05-01T00:00:00Z",
      })
    ).toEqual({ repo: "a/b", since: "2026-05-01T00:00:00Z" });
  });

  it("output is an array of commits", () => {
    const ok = [
      {
        sha: "abc",
        commit: {
          message: "msg",
          author: { name: "alice", date: "2026-05-09T00:00:00Z" },
        },
      },
    ];
    expect(getCommitHistory.outputSchema.parse(ok)).toEqual(ok);
  });
});
