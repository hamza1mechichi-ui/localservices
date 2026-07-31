# STATUS — marketplace

> Single source of truth for resuming work. Read this FIRST when starting a session.
> Update this file at the end of every work phase so the next `/clear` resumes in 1 read.
> Last updated: 2026-07-30

---

## ✅ Done

### Phase admin (reconstruction complète)
- Server Actions admin écrites : `getAllSubscriptions`, `updateUserSubscriptionAction`,
  `getAllUsers`, `banUserAction`, `verifyProAccountAction`, `getAllDemands`,
  `moderateDemandAction` (`src/lib/actions/admin.ts`, `subscription.ts`)
- 4 composants admin réécrits et branchés : `Dashboard.tsx`, `SubscriptionPanel.tsx`,
  `UserManagementTable.tsx`, `DemandManagementTable.tsx`
- Onglets stats / users / subscriptions / demands câblés dans `src/app/admin/page.tsx`
- `npx next build` vert (échouait avant sur `useSession` non exporté par `@/auth`)

### Phase OTP (durcissement + branchement)
- `src/lib/utils/otp.ts` : génération Web Crypto + rejection sampling, `toE164()`
  canonique partagée client/serveur
- `src/lib/utils/rate-limit.ts` : limitation par cible **et** par IP (`isAnyRateLimited`),
  balayage amorti des entrées expirées
- `src/lib/actions/otp.ts` : persistance `userId`, purge des codes expirés, code à
  usage unique, `getClientIp()` tolérant hors request scope
- Chaîne inscription → `/verify-otp` → dashboard connectée (téléphone désormais
  conditionnel au rôle, cf. phase correctifs métier)
- `src/components/PhoneVerificationBanner.tsx` : rappel non bloquant sur le dashboard
  (`src/app/dashboard/layout.tsx` devenu layout serveur async)
- `src/lib/api/twilio.ts` : provider REST réel (SMS + WhatsApp), fallback console
- `.env.example` restauré et complété (`NEXTAUTH_URL` ajouté)
- Interpolation i18n corrigée (`{var}` et non `{{var}}`) + ~17 clés OTP fr/ar-tn

### Phase tests / migration / doc
- `src/__tests__/profile.test.ts` réécrit (l'ancien `src/lib/actions/profile.test.ts`
  était hors du glob Vitest et syntaxiquement invalide) — supprimé
- Bug UX réel corrigé dans `src/lib/actions/profile.ts` : `formData.get()` renvoie
  `null`, ce qui faisait émettre à Zod son message de type anglais au lieu du
  message métier → helpers `str()` / `optionalStr()`
- `e2e/otp.spec.ts` : 7 tests Playwright du parcours OTP
- Migration `prisma/migrations/20260730000000_add_otp_phone_and_admin_fields`
  générée par `migrate diff` ; les 3 migrations marquées `resolve --applied`
  (la base tournait sur `db push`) → `prisma migrate status` : « up to date »
- `README.md` mis à jour : section **Vérification OTP** complète, 12 tables,
  13 Server Actions, 35 composants, 419 clés i18n, features 13→16 documentées

### Phase correctifs métier
- **Dépôt d'avis débloqué** : l'UI n'affichait le formulaire que pour `COMPLETED`
  alors que `submitReview` refusait tout sauf `ACCEPTED` — conditions disjointes,
  donc noter était impossible dans *tous* les cas. Source de vérité partagée
  `src/lib/offer-status.ts` (`canReviewOffer`, `REVIEWABLE_OFFER_STATUSES`)
- **Téléphone conditionnel au rôle** à l'inscription : masqué et ignoré pour un
  Client, affiché et obligatoire (E.164) pour un Prestataire. `.superRefine()`
  côté Zod, `phone = null` forcé côté `register()` (l'UI n'est pas un garde-fou :
  `phone` est `@unique`). Design inchangé (mêmes classes Tailwind)
- `e2e/otp.spec.ts` réécrit autour de `fillProviderForm()` : l'ancien helper
  remplissait `input[name="phone"]` sans passer en rôle Prestataire

### État de validation
- `npx tsc --noEmit` : propre, sans exclusion
- `npx vitest run` : **52/52** sur 7 fichiers
- `npx next build` : vert
- `eslint` : propre sur les fichiers touchés

---

## 🚀 Next phase

**Goal:** Exécuter la suite E2E Playwright de bout en bout et traiter les écarts

### Acceptance criteria
1. 🔜 `npm run test:e2e` passe (17 tests : 8 `basic.spec.ts` + 9 `otp.spec.ts`)
   — **jamais exécutée à ce jour**, les specs ne sont que type-vérifiées
2. 🔜 Vérifier que le seed reste compatible (comptes démo sans téléphone ; les
   prestataires du seed devraient désormais avoir un numéro)
3. 🔜 Décider du remplacement du rate-limiter mémoire par Redis/Upstash si
   déploiement multi-instance visé

### Closed decisions
- Provider: **Twilio** (SMS + WhatsApp), REST direct — pas le SDK `twilio`
- Format téléphone: **E.164**, normalisé par `toE164()` (unique source de vérité)
- Rate limiting: **5 envois/heure** par cible **et** par IP
- Route OTP: **Séparée** (`/verify-otp`)
- Téléphone: **requis pour les prestataires uniquement**, masqué pour les clients.
  Le dashboard reste accessible sans vérification (bannière de rappel) — un
  blocage dur casserait les comptes de démonstration
- Statuts notables d'une offre: `ACCEPTED` **et** `COMPLETED`, définis une seule
  fois dans `src/lib/offer-status.ts` ; ne jamais retester le statut en dur
- Migrations: historique **baseliné** via `resolve --applied` ; ne plus utiliser
  `db push` sans régénérer une migration derrière

---

## 📁 Active architecture

- **Stack:** Next.js 16 (App Router, Turbopack), Prisma 7.8 (SQLite + adapter
  better-sqlite3), Tailwind CSS 4, TypeScript 5, NextAuth v5 beta, Vitest 4, Playwright
- **Tables (12):** User, ProviderProfile, ServiceRequest, Offer, Subscription, Review,
  Category, Notification, Conversation, Message, FavoriteProvider, Otp
- **Patterns:** Server Actions + `ActionResult` (`ok` / `fail`), i18n **custom**
  (`t(key, lang, vars)` — pas next-i18next), `searchParams` awaité (Next 16)

---

## ⚠️ External blockers (don't block coding)

- ⚠️ `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` /
  `TWILIO_WHATSAPP_FROM` non configurés → les codes sortent en console serveur.
  Le parcours est testable en l'état.
- ⚠️ Rate-limiter en mémoire process : quota multiplié en serverless multi-instance.
- ℹ️ Le projet **n'est pas un dépôt git** : toute suppression est irréversible.

---

## 🔧 Useful commands

```bash
# Tests
npm test                    # Tests unitaires (52)
npm run test:e2e            # Tests E2E Playwright (17)

# Prisma
npx prisma migrate status   # Vérifier l'historique
npx prisma migrate dev      # Créer une migration
npx prisma studio           # Ouvrir Prisma Studio
```

---

## 📚 References (read IF needed)

- `.wolf/cerebrum.md` — User Preferences + Do-Not-Repeat + Decision Log
- `.wolf/anatomy.md` — token-efficient file index
- `.wolf/buglog.json` — known bugs + fixes
