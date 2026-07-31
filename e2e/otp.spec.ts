import { test, expect, type Page } from "@playwright/test";

/**
 * Parcours OTP de bout en bout.
 *
 * Le champ téléphone n'est affiché — et obligatoire — que pour le rôle
 * Prestataire : ces tests sélectionnent donc l'onglet « Prestataire » et
 * remplissent les champs métier associés (raison sociale, catégorie, ville).
 *
 * Sans identifiants Twilio, `sendSmsOTP` écrit le code dans la console serveur
 * (`[SMS OTP] To: … | Code: …`). Ce code n'est donc pas accessible depuis le
 * navigateur : ces tests couvrent le parcours (redirections, canaux, cooldown,
 * rejet d'un code faux, bannière de rappel) et non la saisie d'un code valide,
 * qui est couverte par les tests unitaires de `verifyOTPAction`.
 */

/** Numéro tunisien unique par exécution : `phone` est @unique en base. */
function uniquePhone(): string {
  // 8 chiffres commençant par 2 (série mobile tunisienne).
  const suffix = String(Date.now()).slice(-7);
  return `2${suffix}`;
}

/** Remplit le formulaire d'inscription en tant que prestataire. */
async function fillProviderForm(page: Page, phone: string, email: string) {
  await page.context().clearCookies();
  await page.goto("/inscription");
  // Le champ téléphone n'apparaît qu'après le passage en rôle Prestataire.
  await page.getByRole("button", { name: "Prestataire", exact: true }).click();
  await page.fill('input[name="name"]', "OTP E2E");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="phone"]', phone);
  await page.fill('input[name="password"]', "password123");
  await page.fill('input[name="businessName"]', "Entreprise E2E");
  await page.selectOption('select[name="category"]', { index: 1 });
  // LocationPicker ne pose pas d'attribut `name` : la ville est remontée par
  // état React, on cible donc l'input par son placeholder.
  await page.getByPlaceholder(/Paris, Lyon, Marseille/i).fill("Tunis");
}

async function registerWithPhone(page: Page, phone: string) {
  await fillProviderForm(page, phone, `otp-e2e-${Date.now()}@test.fr`);
  await page.click('button[type="submit"]');
}

test("le champ téléphone n'est visible que pour un prestataire", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/inscription");

  // Onglet Client actif par défaut : ni le champ, ni son texte d'aide.
  await expect(page.locator('input[name="phone"]')).toHaveCount(0);
  await expect(page.getByText(/Format international/i)).toHaveCount(0);

  await page.getByRole("button", { name: "Prestataire", exact: true }).click();
  await expect(page.locator('input[name="phone"]')).toBeVisible();
  await expect(page.getByText(/Format international/i)).toBeVisible();
});

test("un prestataire sans téléphone est bloqué à la soumission", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/inscription");
  await page.getByRole("button", { name: "Prestataire", exact: true }).click();
  await page.fill('input[name="name"]', "Pro Sans Tel");
  await page.fill('input[name="email"]', `pro-notel-${Date.now()}@test.fr`);
  await page.fill('input[name="password"]', "password123");
  await page.fill('input[name="businessName"]', "Entreprise E2E");
  await page.selectOption('select[name="category"]', { index: 1 });
  await page.getByPlaceholder(/Paris, Lyon, Marseille/i).fill("Tunis");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/inscription/);
});

test("registering with a phone redirects to /verify-otp", async ({ page }) => {
  await registerWithPhone(page, uniquePhone());

  await page.waitForURL("**/verify-otp**");
  // Étape 1 : choix du canal.
  await expect(page.getByRole("button", { name: /SMS/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /WhatsApp/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Email/i })).toBeVisible();
});

test("an invalid phone number is rejected before submission", async ({ page }) => {
  await fillProviderForm(page, "123", `bad-phone-${Date.now()}@test.fr`); // ni 8 chiffres, ni E.164
  await page.click('button[type="submit"]');

  await expect(page.getByText(/numéro de téléphone invalide/i)).toBeVisible();
  // On reste sur la page d'inscription : aucun compte n'a été créé.
  await expect(page).toHaveURL(/\/inscription/);
});

test("choosing SMS shows the 6-digit code form with a resend countdown", async ({ page }) => {
  await registerWithPhone(page, uniquePhone());
  await page.waitForURL("**/verify-otp**");

  await page.getByRole("button", { name: /SMS/i }).click();
  await page.waitForURL(/channel=sms/);

  // 6 cases de saisie.
  const boxes = page.locator('input[inputmode="numeric"]');
  await expect(boxes).toHaveCount(6);
  // La première case a le focus au chargement.
  await expect(boxes.first()).toBeFocused();
  // Le renvoi est en cooldown : le bouton n'est pas encore proposé.
  await expect(page.getByText(/Renvoyer dans/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Renvoyer le code$/ })).toHaveCount(0);
});

test("an incorrect code shows an error and clears the inputs", async ({ page }) => {
  await registerWithPhone(page, uniquePhone());
  await page.waitForURL("**/verify-otp**");
  await page.getByRole("button", { name: /SMS/i }).click();
  await page.waitForURL(/channel=sms/);

  const boxes = page.locator('input[inputmode="numeric"]');
  // La saisie de la 6e case déclenche la soumission automatique.
  for (const digit of "000000") {
    await page.keyboard.type(digit);
  }

  await expect(page.getByText(/incorrect|expiré/i)).toBeVisible();
  // Les cases sont réinitialisées pour permettre une nouvelle tentative.
  await expect(boxes.first()).toHaveValue("");
});

test("pasting a 6-digit code fills every box", async ({ page }) => {
  await registerWithPhone(page, uniquePhone());
  await page.waitForURL("**/verify-otp**");
  await page.getByRole("button", { name: /SMS/i }).click();
  await page.waitForURL(/channel=sms/);

  const boxes = page.locator('input[inputmode="numeric"]');
  await boxes.first().focus();
  // On simule un collage : `clipboardData` est renseigné manuellement car
  // l'accès au presse-papiers réel demande une permission navigateur.
  await boxes.first().evaluate((el) => {
    const data = new DataTransfer();
    data.setData("text/plain", "135790");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
  });

  for (let i = 0; i < 6; i++) {
    await expect(boxes.nth(i)).toHaveValue("135790"[i]);
  }
});

test("skipping verification lands on the dashboard with a reminder banner", async ({ page }) => {
  await registerWithPhone(page, uniquePhone());
  await page.waitForURL("**/verify-otp**");

  // « Plus tard » : le dashboard doit rester accessible sans vérification.
  await page.getByRole("link", { name: /Plus tard/i }).click();
  await page.waitForURL("**/dashboard/prestataire");

  // La bannière de rappel est affichée et renvoie vers /verify-otp.
  await expect(page.getByText(/Vérifiez votre numéro de téléphone/i)).toBeVisible();
  await page.getByRole("link", { name: /Vérifier maintenant/i }).click();
  await page.waitForURL("**/verify-otp**");
});

test("/verify-otp redirects anonymous visitors to registration", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/verify-otp");
  await page.waitForURL("**/inscription");
});
