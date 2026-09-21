/**
 * Local-only Puppeteer media permission test.
 *
 * This intentionally uses Chromium's fake media devices instead of a
 * real visitor camera/microphone. It is for automated testing only.
 *
 * Run:
 *   MEDIA_TEST_URL=http://localhost/start-video-test.html npm run test:media
 */

const puppeteer = require("puppeteer");

(async () => {
  const target = process.env.MEDIA_TEST_URL || "http://localhost/start-video-test.html";

  const url = new URL(target);
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Media tests are restricted to localhost.");
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.goto(target, { waitUntil: "networkidle2", timeout: 30_000 });

    const startVideoButton = await page.$("#startVideoButton");
    if (!startVideoButton) {
      throw new Error("Could not find #startVideoButton on the local test page.");
    }

    await startVideoButton.click();

    console.log("Local media-stream test completed successfully.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
