# Memory

> Chronological action log. Hooks and AI append to this file automatically.
> Old sessions are consolidated by the daemon weekly.

## Session: 2026-07-26 08:24

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|

## Session: 2026-07-27 10:00 — OTP System Implementation

### Décisions clés pour OTP System :
- Canal par défaut : SMS si téléphone fourni, sinon email
- Code OTP : 6 chiffres, bcrypt hash, 10 min expiration
- Rate limiting : 3 tentatives max, 1h reset
- Format téléphone : E.164 (ex: +21699123456)
- UI : Route séparée /verify-otp, pas de modal
- i18n : FR/AR-TN supporté

### Fichiers créés/modifiés :
- `prisma/schema.prisma` — Modèle OTP + champs User
- `src/lib/actions/otp.ts` — Actions serveur OTP
- `src/lib/api/email.ts` — Wrapper Resend
- `src/lib/api/twilio.ts` — Wrappers SMS/WhatsApp
- `src/lib/utils/otp.ts` — Utilitaires OTP
- `src/lib/utils/rate-limit.ts` — Rate limiting
- `src/components/OTPVerificationModal.tsx` — Modal OTP
- `src/app/verify-otp/page.tsx` — Route de vérification
- `src/app/verify-otp/OTPInputForm.tsx` — Formulaire OTP client
- `src/components/RegisterForm.tsx` — Mise à jour avec téléphone
- `src/lib/i18n.ts` — Clés i18n OTP
- `src/__tests__/otp.test.ts` — Tests unitaires
- `design/specs/otp-flow.md` — Design spec
- `.env.example` — Variables d'environnement
- `.wolf/STATUS.md` — Mise à jour
- `.wolf/memory.md` — Mise à jour
- `.wolf/anatomy.md` — Mise à jour

## Session: 2026-07-28 10:16

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|

## Session: 2026-07-28 11:45

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|

## Session: 2026-07-28 11:50

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|

## Session: 2026-07-29 10:33

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|

## Session: 2026-07-29 11:41

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|

## Session: 2026-07-29 12:58

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|

## Session: 2026-07-29 13:02

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|

## Session: 2026-07-29 18:33

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|

## Session: 2026-07-29 18:42

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|

## Session: 2026-07-30 — Finalisation admin + OTP + migration + doc

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|
| — | Server Actions admin reconstruites | `src/lib/actions/admin.ts`, `subscription.ts` | 7 actions écrites | — |
| — | 4 composants admin réécrits + onglets câblés | `src/components/admin/*.tsx`, `src/app/admin/page.tsx` | `next build` vert | — |
| — | Lint React 19 : `startTransition` dans les effets | 4 fichiers admin | eslint propre | — |
| — | Noyau OTP durci (Web Crypto, `toE164`, IP+cible, purge, usage unique) | `src/lib/utils/otp.ts`, `rate-limit.ts`, `src/lib/actions/otp.ts` | 42 tests verts | — |
| — | Chaîne inscription → `/verify-otp` → dashboard + bannière | `RegisterForm.tsx`, `verify-otp/*`, `PhoneVerificationBanner.tsx`, `dashboard/layout.tsx` | téléphone facultatif | — |
| — | Provider Twilio REST réel + fallback console | `src/lib/api/twilio.ts`, `.env.example` | flux testable sans compte | — |
| — | `profile.test.ts` réécrit dans le glob Vitest ; bug Zod/FormData corrigé | `src/__tests__/profile.test.ts`, `src/lib/actions/profile.ts` | message métier restauré | — |
| — | 7 tests E2E OTP | `e2e/otp.spec.ts` | typecheck OK | — |
| — | Migration de dérive générée + historique baseliné | `prisma/migrations/20260730000000_add_otp_phone_and_admin_fields/` | `migrate status` : up to date | — |
| — | README réaligné sur le code (12 tables, 419 clés, section OTP) | `README.md`, `.env.example` | doc à jour | — |

**Validation finale :** `tsc --noEmit` propre · `vitest run` 42/42 · `next build` vert.

## Session: 2026-07-30 (suite) — Correction du dépôt d'avis

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|
| — | Diagnostic : conditions UI et serveur disjointes (COMPLETED vs ACCEPTED) | `page.tsx`, `reviews.ts` | dépôt d'avis impossible dans tous les cas | — |
| — | Source de vérité partagée des statuts notables | `src/lib/offer-status.ts` (nouveau) | `canReviewOffer()` | — |
| — | Server Action alignée | `src/lib/actions/reviews.ts` | accepte ACCEPTED + COMPLETED | — |
| — | UI alignée + libellé selon statut | `src/app/dashboard/client/page.tsx`, `src/lib/i18n.ts` | clé `dash.client.reviewInvite` | — |
| — | Test de non-régression | `src/__tests__/offer-status.test.ts` | 47/47 tests verts | — |

**Validation :** `tsc --noEmit` propre · `vitest run` 47/47 · `next build` vert.

## Session: 2026-07-30 (suite) — Téléphone conditionnel au rôle à l'inscription

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|
| — | Champ téléphone déplacé dans le bloc `role === "PROVIDER"` (input, label, aide) | `src/components/RegisterForm.tsx` | masqué pour un Client, classes Tailwind inchangées | — |
| — | Validation Zod conditionnelle via `.superRefine()` | `src/lib/actions/auth.ts` | requis + E.164 seulement si PROVIDER | — |
| — | `phone = null` forcé côté serveur pour un CLIENT | `src/lib/actions/auth.ts` | une requête forgée ne peut plus réserver un numéro `@unique` | — |
| — | Clé i18n `auth.phoneRequired` (fr + ar-tn) | `src/lib/i18n.ts` | message métier français | — |
| — | 5 tests unitaires de la règle conditionnelle | `src/__tests__/register-phone.test.ts` (nouveau) | 52/52 tests verts | — |
| — | Régression E2E corrigée : helper `fillProviderForm()` | `e2e/otp.spec.ts`, `e2e/basic.spec.ts` | 9 tests OTP (2 nouveaux) | — |
| — | Doc réalignée | `README.md`, `design/specs/otp-flow.md` | tableau rôle → champ téléphone | — |

**Validation :** `tsc --noEmit` propre · `vitest run` 52/52 · `eslint` propre · `next build` vert.
**Non vérifié :** `npm run test:e2e` n'a toujours jamais été exécuté.

## Session: 2026-07-30 (suite) — Config Supabase (variables uniquement)

| Time | Action | File(s) | Outcome | ~Tokens |
|------|--------|---------|---------|--------|
| — | Bloc PostgreSQL/Supabase documenté **en commentaire** (non actif) | `.env.example` | `DATABASE_URL` port 6543 + `DIRECT_URL` port 5432 | — |
| — | Agent Skills Supabase installées (choix utilisateur) | `.agents/skills/supabase`, `.agents/skills/supabase-postgres-best-practices` | scan « Safe / 0 alerts », auteur `supabase` | — |

**Non fait (hors périmètre demandé) :** `prisma/schema.prisma` déclare toujours
`provider = "sqlite"` ; aucune migration Postgres générée ; aucun code touché.
