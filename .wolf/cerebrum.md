# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-07-30

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

- **Langue de travail : français.** Commentaires de code, messages d'erreur métier,
  libellés UI et documentation sont rédigés en français.
- **Code complet et typé.** L'utilisateur demande explicitement du TypeScript typé,
  fichier par fichier, sans `any` ni extrait tronqué.
- **Reconstruire plutôt que rapiécer.** Face à 4 composants admin cassés, l'utilisateur
  a choisi « Tout reconstruire » plutôt qu'un correctif minimal.
- **Ne pas bloquer l'utilisateur final.** Sur la vérification OTP, il a préféré un
  téléphone facultatif + bannière de rappel à un blocage dur du dashboard.
- **Ne demander que le strictement nécessaire dans les formulaires.** Le champ
  téléphone doit être *totalement* masqué (input, label **et** texte d'aide) quand
  il ne s'applique pas au rôle — pas seulement désactivé ou rendu optionnel.
- **Ne pas toucher au design existant** lors d'une modification fonctionnelle :
  mêmes classes Tailwind, mêmes boutons d'onglets.

## Key Learnings

- **Project:** marketplace
- **Description:** Plateforme de mise en relation entre clients et professionnels de services.
- **i18n custom, pas i18next.** `t(key, lang, vars)` n'interpole que `{var}` — la
  syntaxe `{{var}}` s'affiche littéralement. Toute clé doit exister en `fr` **et** `ar-tn`.
- **NextAuth v5 beta.** `src/auth.ts` n'exporte que `{ handlers, signIn, signOut, auth }`.
  Pas de `useSession` : la session se lit côté serveur.
- **Next 16.** `searchParams` est une `Promise` (à awaiter) ; `headers()` est async et
  lève hors request scope (donc en test).
- **React 19.** `setState` déclenché depuis un effet doit passer par `startTransition`
  (règle `react-hooks/set-state-in-effect`).
- **Prisma 7.** `migrate diff` : plus de `--shadow-database-url`, et `--to-schema-datamodel`
  devient `--to-schema`. Le champ mot de passe du modèle User s'appelle `hashedPassword`.
- **Vitest.** Le glob est `src/__tests__/**/*.test.{ts,tsx}` : un test placé ailleurs
  n'est jamais exécuté (et peut donc pourrir silencieusement).
- **Le projet n'est pas un dépôt git.** Toute suppression de fichier est irréversible.
- **Supabase (non actif).** Une base Postgres Supabase existe (`aws-0-eu-west-3`,
  projet `szetyjxznlzedzvthyvn`), documentée en commentaire dans `.env.example`.
  Le schéma reste sur `provider = "sqlite"`. Le **port 6543 est le pooler en mode
  transaction** : `prisma migrate` y échoue, d'où la nécessité d'un `DIRECT_URL`
  sur le port 5432. Les 3 migrations existantes sont en SQL SQLite (`RedefineTables`)
  et ne rejoueront pas sur Postgres : une bascule exige un historique neuf.

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

- [2026-07-30] Ne pas importer `useSession` depuis `@/auth` — non exporté en NextAuth v5.
- [2026-07-30] Ne pas écrire `{{var}}` dans `src/lib/i18n.ts` — utiliser `{var}`.
- [2026-07-30] Ne pas ajouter `import "server-only"` — le paquet n'est pas une dépendance.
- [2026-07-30] Ne pas se fier à `formData.get(k) || undefined` pour un champ **requis** :
  Zod émet alors son message de type en anglais au lieu du message métier français.
  Normaliser en chaîne vide pour les champs requis.
- [2026-07-30] Ne pas créer un test hors de `src/__tests__/` : il ne sera pas exécuté.
- [2026-07-30] Ne pas utiliser `prisma db push` sans générer la migration correspondante
  derrière — c'est ce qui a produit une dérive de schéma de deux mois.
- [2026-07-30] `prisma migrate diff -o` refuse d'écrire dans un dossier de migration vide
  (P3015) : générer vers un fichier temporaire puis copier.
- [2026-07-30] Ne pas cibler `input[name="location"]` dans un test E2E : `LocationPicker`
  est rendu sans prop `name` sur la page d'inscription (la ville remonte par état React).
  Cibler le placeholder à la place.
- [2026-07-30] Après avoir rendu un champ conditionnel dans un formulaire, relire les
  specs Playwright qui le remplissent : `page.fill()` échoue sur un input non rendu.

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->

- [2026-07-30] **Téléphone facultatif à l'inscription** (choix utilisateur). Un blocage
  dur de `/verify-otp` casserait les comptes de démonstration du seed, qui n'ont pas
  de numéro. Le dashboard reste accessible avec une bannière de rappel dismissible.
- [2026-07-30] **Téléphone conditionnel au rôle** (choix utilisateur, 2e itération). Le
  champ est masqué et ignoré pour un Client, affiché et **obligatoire** (E.164) pour un
  Prestataire, qui doit être joignable. La validation Zod passe par `.superRefine()` et
  `register()` force `phone = null` quand le rôle est CLIENT : l'UI ne peut pas servir
  de garde-fou, une requête forgée consommerait sinon un numéro (`phone` est `@unique`).
  Remplace la décision précédente « téléphone facultatif pour tous ».
- [2026-07-30] **Twilio via REST direct, pas le SDK `twilio`.** Deux appels `fetch`
  suffisent ; le SDK ajoute une dépendance lourde et des soucis de bundling côté serveur.
- [2026-07-30] **Fallback console systématique.** Sans identifiants Twilio/SMTP, les
  codes sont loggés côté serveur : le parcours complet reste testable sans compte tiers.
- [2026-07-30] **`toE164()` comme unique source de normalisation**, partagée client et
  serveur. Deux normalisations divergentes produiraient des cibles OTP non concordantes.
- [2026-07-30] **Rate limiting par cible ET par IP**, sans court-circuit d'évaluation,
  afin que chaque compteur soit incrémenté à chaque tentative.
- [2026-07-30] **Historique de migrations baseliné** via `migrate resolve --applied`
  plutôt que reconstruit : la base contenait déjà les données de démonstration.
