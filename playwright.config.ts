import { defineConfig, devices } from "@playwright/test";
import { appEnv } from "./tests/e2e/support/local-supabase";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/*
 * End-to-end tests. Needs the local Supabase stack running
 * (`npx supabase start`); the app is built and served against it on :3100,
 * in its own dist folder so it never collides with `next dev`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next build && npx next start --port ${PORT}`,
    url: baseURL,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: { ...appEnv(), NEXT_DIST_DIR: ".next-e2e", NEXT_PUBLIC_SITE_URL: baseURL },
  },
});
