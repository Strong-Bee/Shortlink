import { test, expect } from "@playwright/test";

test("shortlink generator loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});

test("link page handles browser permissions in test mode", async ({ page }) => {
  await page.goto("/link?t=" + Buffer.from("https://example.com").toString("base64"));
  await expect(page.locator("main")).toBeVisible();
});
