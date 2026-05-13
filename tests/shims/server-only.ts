// No-op stand-in for the `server-only` package in the vitest environment.
// The real package throws at import time to guard against client-side
// bundling; tests don't need that guard.
export {};
