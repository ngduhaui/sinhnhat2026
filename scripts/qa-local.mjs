import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.QA_URL || "http://127.0.0.1:3000/";
mkdirSync("screenshots", { recursive: true });

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe`,
});
const errors = [];

async function shoot(name, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name}: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`${name} pageerror: ${e.message}`));
  page.on("requestfailed", (r) => errors.push(`${name} reqfail: ${r.url()} ${r.failure()?.errorText}`));
  const res = await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 160);
  const hasScrollX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await page.screenshot({ path: `screenshots/${name}-closed.png`, fullPage: false });
  console.log(JSON.stringify({ name, status: res?.status(), text, hasScrollX }));
  return { page, ctx };
}

const desktop = await shoot("desktop", 1440, 900);
// open letter
await desktop.page.getByRole("button", { name: /Mở phong thư/i }).click();
await desktop.page.waitForTimeout(1200);
await desktop.page.screenshot({ path: "screenshots/desktop-open.png", fullPage: false });
// blow candles
await desktop.page.getByRole("button", { name: /^Thổi nến$/i }).click();
await desktop.page.waitForTimeout(1500);
await desktop.page.screenshot({ path: "screenshots/desktop-candles-out.png", fullPage: false });
// open gift
await desktop.page.locator(".gift-lid").click();
await desktop.page.waitForTimeout(1200);
await desktop.page.locator(".gift-scene").scrollIntoViewIfNeeded();
await desktop.page.screenshot({ path: "screenshots/desktop-gift.png", fullPage: false });
const openText = (await desktop.page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200);
console.log(JSON.stringify({ openText }));
await desktop.ctx.close();

const mobile = await shoot("mobile", 390, 844);
await mobile.page.getByRole("button", { name: /Mở phong thư/i }).click();
await mobile.page.waitForTimeout(1200);
await mobile.page.screenshot({ path: "screenshots/mobile-open.png", fullPage: false });
const mobileOverflow = await mobile.page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 1,
);
console.log(JSON.stringify({ mobileOverflow }));
await mobile.ctx.close();

await browser.close();
console.log(JSON.stringify({ errors }, null, 2));
