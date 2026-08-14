import puppeteer from "puppeteer-core";
import path from "path";

async function main() {
  console.log("📸 Launching Headless Chrome to capture Mobile Viewport Screenshots...");

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    headless: true
  });

  const page = await browser.newPage();
  
  // Set iPhone 14 Pro Mobile Viewport
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const artifactsDir = "/home/shaolin/.gemini/antigravity/brain/22255970-7291-4609-944e-29f453bb7781";

  // 1. Capture Mobile Auth Screen
  console.log("Navigating to http://localhost:3000 (Auth Screen)...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.removeItem("spresso_user"));
  await page.reload({ waitUntil: "networkidle0" });

  const authMobilePath = path.join(artifactsDir, "mobile_auth_screen.png");
  await page.screenshot({ path: authMobilePath, fullPage: false });
  console.log(`✅ Saved Mobile Auth Screen Screenshot to: ${authMobilePath}`);

  // 2. Click Guest Sign-In to navigate to Mobile Main AI Shopper Chat Page
  console.log("Clicking Guest Sign In...");
  const guestBtn = await page.waitForSelector("button:nth-last-child(1)");
  if (guestBtn) {
    await guestBtn.click();
    await new Promise(r => setTimeout(r, 2000));
  }

  const mainMobilePath = path.join(artifactsDir, "mobile_main_chat_screen.png");
  await page.screenshot({ path: mainMobilePath, fullPage: false });
  console.log(`✅ Saved Mobile Main Chat Screen Screenshot to: ${mainMobilePath}`);

  await browser.close();
  console.log("🎉 Mobile Screenshot Capture Complete!");
}

main().catch(err => {
  console.error("Screenshot capture error:", err);
  process.exit(1);
});
