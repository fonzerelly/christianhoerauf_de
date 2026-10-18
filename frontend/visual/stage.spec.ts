import { expect, test } from "@playwright/test";

test("die Seite lädt und zeigt die leere Bühne", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");

  await expect(page.locator("#stage")).toBeVisible();
  await expect(page).toHaveScreenshot("leere-buehne.png");
  expect(errors).toEqual([]);
});
