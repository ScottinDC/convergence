// @ts-check
const { test, expect } = require("@playwright/test");

const STORAGE_KEYS = [
  "convergence-health-planner",
  "convergence-health-profile"
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript((keys) => {
    keys.forEach((key) => localStorage.removeItem(key));
  }, STORAGE_KEYS);
});

test.describe("ComboDiet", () => {
  test("loads with ComboDiet branding and Diet Explorer title", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/ComboDiet/i);
    await expect(page.getByRole("banner").getByText("ComboDiet")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Diet Explorer", level: 1 })).toBeVisible();
  });

  test("framework cards select and deselect", async ({ page }) => {
    await page.goto("/");

    const ketoCard = page.locator('label.framework-option', {
      has: page.locator('input[name="framework"][value="keto"]')
    });
    const ketoInput = ketoCard.locator('input[name="framework"][value="keto"]');

    await expect(ketoInput).not.toBeChecked();
    await ketoCard.click();
    await expect(ketoInput).toBeChecked();

    await ketoCard.click();
    await expect(ketoInput).not.toBeChecked();
  });

  test("adds a condition with symptoms to the saved list", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#condition-name")).toHaveAttribute(
      "placeholder",
      "Example: leukemia or liver cancer"
    );
    await page.getByLabel("Condition or diagnosis").fill("Test Condition");
    await page.getByLabel(/Symptoms/i).fill("fatigue, nausea");
    await page.getByRole("button", { name: "Add this condition" }).click();

    await expect(page.locator("#condition-count")).toHaveText("1 saved");
    await expect(page.locator(".condition-item .condition-title")).toHaveText("Test Condition");
    await expect(page.locator(".condition-item")).toContainText("Fatigue");
    await expect(page.locator(".condition-item")).toContainText("Nausea");
  });

  test("adds a condition when saved data is malformed", async ({ page }) => {
    await page.addInitScript((storageKey) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify([{ id: "legacy", name: "Legacy condition" }])
      );
    }, STORAGE_KEYS[0]);

    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");

    await expect(page.locator("#condition-count")).toHaveText("1 saved");
    expect(pageErrors).toEqual([]);

    await page.getByLabel("Condition or diagnosis").fill("Leukemia");
    await page.getByLabel(/Symptoms/i).fill("fatigue");
    await page.getByRole("button", { name: "Add this condition" }).click();

    await expect(page.locator("#condition-count")).toHaveText("2 saved");
    await expect(page.locator(".condition-item .condition-title").last()).toHaveText("Leukemia");
  });

  test("overview tiles update after adding a condition", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#conditions-total")).toHaveText("0");
    await expect(page.locator("#shared-symptom-total")).toHaveText("0");

    await page.getByLabel("Condition or diagnosis").fill("Overview Test");
    await page.getByLabel(/Symptoms/i).fill("headache");
    await page.getByRole("button", { name: "Add this condition" }).click();

    await expect(page.locator("#conditions-total")).toHaveText("1");
    await expect(page.locator("#condition-count")).toHaveText("1 saved");
  });

  test("nutritional options section renders after frameworks load", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Nutritional options" })).toBeVisible();

    const nutritionPanel = page.locator("#nutrition-options");
    await expect(nutritionPanel).not.toContainText(
      "Comparing foods across the selected frameworks",
      { timeout: 30_000 }
    );

    await expect(nutritionPanel).toContainText("Foods aligned across selected frameworks");
  });

  test("health endpoint responds OK", async ({ request }) => {
    const response = await request.get("/health");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toMatchObject({ ok: true });
  });

  test("data download page loads", async ({ page }) => {
    await page.goto("/data/download.html");

    await expect(page).toHaveTitle(/ComboDiet Diet Data/i);
    await expect(page.getByRole("heading", { name: "ComboDiet Diet Data", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "dash.json" })).toBeVisible();
  });
});
