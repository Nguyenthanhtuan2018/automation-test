import { test, expect } from '@playwright/test';

test.describe("Login", () => {
  test("Valid Login", async ({ page }) => {
    // Step 1: GOTO page.login
    await page.goto(`/index.html`);
    // Step 2: FILL email
    await page.locator(`#email`).fill(`user@ex.com`);
    // Step 3: FILL password
    await page.locator(`#password`).fill(`12345678`);
    // Step 4: CLICK submit
    await page.locator(`#submitBtn`).click();
    // Step 5: EXPECT_URL 
    await expect(page).toHaveURL(new RegExp(`/dashboard`));
  });

  test("Invalid Login – Wrong pw", async ({ page }) => {
    // Step 1: GOTO page.login
    await page.goto(`/index.html`);
    // Step 2: FILL email
    await page.locator(`#email`).fill(`user@ex.com`);
    // Step 3: FILL password
    await page.locator(`#password`).fill(`wrong`);
    // Step 4: CLICK submit
    await page.locator(`#submitBtn`).click();
    // Step 5: EXPECT_TEXT 
    await expect(page.locator(`#error`)).toContainText(`Invalid`);
  });

  test("Empty Email & Password", async ({ page }) => {
    // Step 1: GOTO page.login
    await page.goto(`/index.html`);
    // Step 2: CLICK submit
    await page.locator(`#submitBtn`).click();
    // Step 3: EXPECT_VISIBLE 
    await expect(page.locator(`#error`)).toBeVisible();
  });

  test("Invalid Email Format", async ({ page }) => {
    // Step 1: GOTO page.login
    await page.goto(`/index.html`);
    // Step 2: FILL email
    await page.locator(`#email`).fill(`abc`);
    // Step 3: FILL password
    await page.locator(`#password`).fill(`12345678`);
    // Step 4: CLICK submit
    await page.locator(`#submitBtn`).click();
    // Step 5: EXPECT_VISIBLE 
    await expect(page.locator(`#email`)).toBeVisible();
  });

});
