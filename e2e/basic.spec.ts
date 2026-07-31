import { test, expect } from "@playwright/test";

test("home page shows title and CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Trouvez le bon professionnel");
  await expect(page.getByRole("link", { name: "Commencer maintenant" })).toBeVisible();
});

test("navigation to prestataires page", async ({ page }) => {
  await page.goto("/prestataires");
  await expect(page.locator("h1")).toContainText("Trouver un prestataire");
});

test("connexion page displays form", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/connexion");
  await expect(page.locator("h1")).toContainText("Connexion");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test("inscription page displays form", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/inscription");
  await expect(page.locator("h1")).toContainText("Inscription");
  await expect(page.locator('input[name="name"]')).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test("navbar reflects session immediately after registration (no reload needed)", async ({ page }) => {
  await page.context().clearCookies();
  const email = `e2e-${Date.now()}@test.fr`;

  await page.goto("/inscription");
  await page.fill('input[name="name"]', "Test E2E");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  // Rôle Client : le champ téléphone n'est pas rendu, l'inscription va donc
  // directement au dashboard sans passer par /verify-otp (cf. otp.spec.ts).
  await page.click('button[type="submit"]');

  await page.waitForURL("**/dashboard/client");
  // Régression couverte : la Navbar doit afficher le nom de l'utilisateur dès
  // le premier rendu après connexion, sans rechargement manuel de la page.
  await expect(page.locator("header")).toContainText("Test E2E");
  await expect(page.locator("header").getByText("Connexion", { exact: true })).not.toBeVisible();
});

test("PWA manifest is served", async ({ page }) => {
  const response = await page.goto("/manifest.webmanifest");
  expect(response?.status()).toBe(200);
  const json = await response?.json();
  expect(json.name).toContain("LocalServices");
});

test("robots.txt is accessible", async ({ page }) => {
  const response = await page.goto("/robots.txt");
  expect(response?.status()).toBe(200);
  const text = await response?.text();
  expect(text).toContain("Disallow: /dashboard/");
});

test("sitemap.xml is accessible", async ({ page }) => {
  const response = await page.goto("/sitemap.xml");
  expect(response?.status()).toBe(200);
  const text = await response?.text();
  expect(text).toContain("<urlset");
});
