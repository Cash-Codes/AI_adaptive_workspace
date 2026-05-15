import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library's auto-cleanup requires test-framework globals.
// We run vitest with `globals: false`, so call cleanup manually after each test
// to unmount components and reset the DOM between tests.
afterEach(() => {
  cleanup();
});
