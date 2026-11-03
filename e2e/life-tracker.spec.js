import { expect, test, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function resetApp(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Η συνολική μου εικόνα" })).toBeVisible();
}

async function createAreaAndMetric(page) {
  await page.getByRole("button", { name: "Δημιουργία πρώτου τομέα" }).click();
  await page.locator("#area-name").fill("Υγεία");
  await page.locator("#active-dialog").getByRole("button", { name: "Προσθήκη", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Υγεία", level: 3 })).toBeVisible();
  await page.getByRole("button", { name: "Νέος στόχος / standard" }).click();
  await page.locator("#metric-title").fill("Βήματα την ημέρα");
  await page.locator("#desired").fill("10000");
  await page.locator("#initial").fill("1000");
  await page.locator("#active-dialog").getByRole("button", { name: "Προσθήκη", exact: true }).click();
  await expect(page.getByRole("button", { name: "Λεπτομέρειες: Βήματα την ημέρα" })).toBeVisible();
}

function currentValue(page) {
  return page.locator(".compact-card").first().locator(".compact-values span").first().locator("strong");
}

test("create area and item, update, reload, backup round trip", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await resetApp(page);
  await createAreaAndMetric(page);
  await expect(currentValue(page)).toHaveText("1.000");

  await page.getByRole("button", { name: "Λεπτομέρειες: Βήματα την ημέρα" }).click();
  await page.getByRole("button", { name: "Ενημέρωση", exact: true }).click();
  await page.locator("#current-input").fill("8000");
  await page.locator("#active-dialog").getByRole("button", { name: "Καταγραφή" }).click();
  await expect(currentValue(page)).toHaveText("8.000");

  await page.reload();
  await expect(page.getByRole("button", { name: "Λεπτομέρειες: Βήματα την ημέρα" })).toBeVisible();
  await expect(currentValue(page)).toHaveText("8.000");
  await expect(page.getByRole("heading", { name: "Υγεία", level: 3 })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.locator("footer").getByRole("button", { name: "Εξαγωγή JSON" }).click();
  const download = await downloadPromise;
  const backupPath = join(tmpdir(), `it-works-e2e-${Date.now()}.json`);
  await download.saveAs(backupPath);

  await page.locator("footer").getByRole("button", { name: "Εκκαθάριση" }).click();
  await expect(page.getByRole("button", { name: "Δημιουργία πρώτου τομέα" })).toBeVisible();

  await page.locator("#backup-file").setInputFiles(backupPath);
  await expect(page.getByRole("heading", { name: "Υγεία", level: 3 })).toBeVisible();
  await expect(currentValue(page)).toHaveText("8.000");
});

test("a failed save rolls the screen back and explains it in Greek", async ({ page }) => {
  await resetApp(page);
  await createAreaAndMetric(page);
  await expect(currentValue(page)).toHaveText("1.000");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (String(key).includes("it-works")) {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      }
      return original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Λεπτομέρειες: Βήματα την ημέρα" }).click();
  await page.getByRole("button", { name: "Ενημέρωση", exact: true }).click();
  await page.locator("#current-input").fill("9999");
  await page.locator("#active-dialog").getByRole("button", { name: "Καταγραφή" }).click();
  await expect(page.getByRole("alert")).toContainText("Δεν αποθηκεύτηκε");
  await expect(page.getByRole("alert")).toContainText("τελευταία αποθηκευμένη");
  await expect(page.locator("#toast")).toContainText("Δεν αποθηκεύτηκε");
  await expect(currentValue(page)).toHaveText("1.000");
  await page.reload();
  await expect(currentValue(page)).toHaveText("1.000");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("install metadata allows zoom and asks to keep storage", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {
        persisted: async () => false,
        persist: async () => {
          window.__persistCalls = (window.__persistCalls || 0) + 1;
          return true;
        },
      },
    });
  });
  await page.goto("/");
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).not.toContain("user-scalable");
  expect(viewport).not.toContain("maximum-scale");
  expect(viewport).toContain("viewport-fit=cover");
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute("content", "black-translucent");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "It Works");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "./icons/apple-touch-icon.png");
  const manifest = await page.evaluate(async () => (await (await fetch("./manifest.webmanifest")).json()));
  expect(manifest.name).toBe("It Works — Life Tracker");
  expect(manifest.name).not.toContain("Preview");
  expect(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.type === "image/png" && icon.purpose === "any")).toBe(true);
  expect(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable")).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__persistCalls || 0)).toBe(1);
  await page.getByRole("button", { name: "Δημιουργία πρώτου τομέα" }).click();
  const fontSize = await page.locator("#area-name").evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
});

test("service worker serves the shell while offline", async ({ browser }) => {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    serviceWorkers: "allow",
    baseURL: "http://127.0.0.1:4173",
    locale: "el-GR",
  });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect.poll(async () => page.evaluate(() => Boolean(navigator.serviceWorker?.controller)).catch(() => false)).toBe(true);
    await expect(page.getByRole("heading", { name: "Η συνολική μου εικόνα" })).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Η συνολική μου εικόνα" })).toBeVisible();
  } finally {
    await context.close();
  }
});
