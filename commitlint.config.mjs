const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "subject-case": [0],
    "scope-enum": [
      2,
      "always",
      [
        "events",
        "hash",
        "storage",
        "api",
        "tools",
        "runtime",
        "ui",
        "test",
        "ci",
        "docs",
        "deps",
        "config",
        "scaffold",
        "tooling",
      ],
    ],
  },
};

export default config;
