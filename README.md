# LocalServices — Marketplace de services locaux

Plateforme de mise en relation entre clients et professionnels de services.
Adaptée aux **normes tunisiennes** avec support du **français** et de **l'arabe tunisien** (RTL).

---

## Stack technique

```
Frontend : Next.js 16 (App Router, Turbopack) + TypeScript 5 + Tailwind CSS v4
Backend  : Next.js Server Actions + Prisma ORM 7.8
Database : SQLite (dev) → PostgreSQL (prod via Supabase/Neon)
Auth     : NextAuth v5 (Credentials provider, JWT) + OTP SMS/WhatsApp/email
Maps     : Leaflet + OpenStreetMap + Nominatim
Email    : Nodemailer (SMTP)
SMS      : Twilio REST API (SMS + WhatsApp), fallback console en dev
IA       : Google Gemini (génération de descriptions de demandes)
Tests    : Vitest (unitaire) + Playwright (E2E)
PWA      : Service Worker custom + Web Manifest
i18n     : Système custom français / العربية التونسية (RTL)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Navigateur Client                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Next.js  │  │  React   │  │ Tailwind │  │   Leaflet.js     │   │
│  │ App      │  │  Server  │  │   CSS    │  │   (cartes)       │   │
│  │ Router   │  │  Actions │  │  v4      │  │                  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ HTTP / RSC
┌─────────────────────────▼───────────────────────────────────────────┐
│                        Next.js Server                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Server Actions                             │  │
│  │  ┌───────┐ ┌──────┐ ┌───────┐ ┌──────┐ ┌─────┐ ┌────────┐ │  │
│  │  │ Auth  │ │Profile│ │Reques│ │Offers│ │Favs │ │Admin   │ │  │
│  │  │       │ │       │ │ ts    │ │      │ │     │ │        │ │  │
│  │  └───────┘ └──────┘ └───────┘ └──────┘ └─────┘ └────────┘ │  │
│  │  ┌────────┐ ┌──────────┐ ┌────────────┐ ┌───────────────┐ │  │
│  │  │Reviews │ │Messages  │ │Notif.      │ │Subscriptions  │ │  │
│  │  └────────┘ └──────────┘ └────────────┘ └───────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐   │
│  │  i18n    │  │   Geo    │  │  Email   │  │     Utils       │   │
│  │ 419 clés │  │Nominatim │  │Nodemailer│  │ cn, format, etc │   │
│  │ fr/ar-tn │  │Haversine │  │7 templates│  │ CATEGORIES,     │   │
│  │ RTL      │  │ BBox     │  │          │  │ villes TN       │   │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐   │
│  │  OTP     │  │  Twilio  │  │ Gemini   │  │  Rate limiting  │   │
│  │ bcrypt   │  │SMS/WhatsA│  │ (IA)     │  │  cible + IP     │   │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────┘   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ Prisma ORM
┌─────────────────────────▼───────────────────────────────────────────┐
│                         SQLite / PostgreSQL                         │
│                                                                     │
│  ┌────────┐  ┌───────────────┐  ┌────────────┐  ┌───────────────┐ │
│  │  User  │──│ProviderProfile│  │ServiceReque│  │    Offer      │ │
│  │        │  │               │  │    st       │  │               │ │
│  └────────┘  └───────────────┘  └────────────┘  └───────────────┘ │
│  ┌────────┐  ┌───────────────┐  ┌────────────┐  ┌───────────────┐ │
│  │  Revie │  │  Conversatio  │  │  Message   │  │ Notificatio   │ │
│  │   w    │  │      n        │  │            │  │      n        │ │
│  └────────┘  └───────────────┘  └────────────┘  └───────────────┘ │
│  ┌───────────────┐  ┌────────────┐  ┌───────────────┐  ┌───────┐  │
│  │FavoriteProvid │  │Category    │  │Subscription   │  │ Otp   │  │
│  │     er        │  │            │  │               │  │       │  │
│  └───────────────┘  └────────────┘  └───────────────┘  └───────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Modèle de données (12 tables)

```
User (1) ──── (1) ProviderProfile    User (1) ──── (N) ServiceRequest
 │                                      │
 ├── (N) Offer (as client)              ├── (N) Offer (as client)
 ├── (N) Review (as client)             ├── (N) Review (as client)
 ├── (N) Notification                   ├── (N) Conversation (as client)
 ├── (N) Conversation (as client)        └── (N) FavoriteProvider (as client)
 ├── (N) Message
 ├── (1) Subscription
 └── (N) FavoriteProvider (as client)

ProviderProfile (1) ──── (N) Offer
ProviderProfile (1) ──── (N) Review
ProviderProfile (1) ──── (N) Conversation
ProviderProfile (1) ──── (N) FavoriteProvider

ServiceRequest (1) ──── (N) Offer
ServiceRequest (1) ──── (N) Review
ServiceRequest (1) ──── (N) Conversation

Offer (1) ──── (1) Review
Offer ──── ProviderProfile, User, ServiceRequest

Conversation (1) ──── (N) Message
Conversation ──── User (client), ProviderProfile, ServiceRequest

Otp ──── User (optionnel : userId nullable, cascade delete)
```

Champs notables ajoutés au fil des itérations :

| Table | Champs | Rôle |
|---|---|---|
| `User` | `phone`, `verifiedPhone`, `emailVerified` | Vérification OTP (téléphone requis pour les prestataires, unique) |
| `User` | `banned`, `bannedReason`, `bannedAt` | Modération admin |
| `ProviderProfile` | `plan`, `offerTokens`, `tokensResetAt` | Abonnement + quota d'offres |
| `ProviderProfile` | `verified`, `verifiedAt` | Badge « compte pro vérifié » |
| `ProviderProfile` | `avatarUrl`, `websiteUrl`, `*Url` réseaux sociaux | Profil public enrichi |
| `ProviderProfile` | `portfolioImages`, `portfolioVideos` | Portfolio (tableaux sérialisés en JSON) |
| `ServiceRequest` | `audioUrl` | Note vocale jointe à la demande |
| `Otp` | `target`, `channel`, `otpHash`, `expiresAt`, `attempts` | Code à usage unique haché (bcrypt) |

---

## Routes et pages

| Route | Type | Description |
|---|---|---|
| `/` | Server | Page d'accueil enrichie (hero, stats, comment ça marche, prestataires à la une, témoignages, CTA) |
| `/connexion` | Server | Connexion |
| `/inscription` | Server | Inscription (client sans téléphone, prestataire avec téléphone requis) |
| `/verify-otp` | Server | Vérification du numéro par code à 6 chiffres (SMS / WhatsApp / email) |
| `/prestataires` | Client | Recherche et liste des prestataires (filtres, pagination, favoris) |
| `/prestataires/[id]` | Server | Profil public prestataire (infos, carte Leaflet, avis, favoris) |
| `/dashboard/client` | Client | Dashboard client (demandes CRUD, offres, favoris, messagerie, paramètres) |
| `/dashboard/prestataire` | Client | Dashboard prestataire (browse demandes, offres, avis, messagerie, abonnement) |
| `/admin` | Client | Administration (stats, catégories CRUD, modération avis, utilisateurs, abonnements, demandes) |
| `/manifest.webmanifest` | - | Manifest PWA |
| `/robots.txt` | - | SEO |
| `/sitemap.xml` | - | Sitemap dynamique |

### API Routes

| Route | Méthode | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Authentification NextAuth |
| `/api/upload` | POST | Upload d'images |
| `/api/cron/reset-tokens` | POST | CRON reset tokens prestataires |

---

## Fonctionnalités

### 1. Upload d'images
- Upload via `POST /api/upload`, stockage dans `public/uploads/`
- Images liées aux demandes (stockées en JSON dans `ServiceRequest.images`)
- Preview dans le formulaire de création de demande

### 2. Favoris
- Heart toggle sur les cartes prestataires et pages profil
- Table dédiée `FavoriteProvider` avec contrainte unique
- Onglet Favoris dans le dashboard client

### 3. Admin avancé
- Stats globales (12 indicateurs + top catégories avec barres)
- CRUD catégories personnalisées
- Modération des avis (masquer/supprimer)
- Gestion des utilisateurs : bannir / débannir (avec motif), vérifier un compte pro
- Gestion des abonnements : changer le plan d'un utilisateur
- Modération des demandes : consultation et suppression

### 4. Dashboard client amélioré
- Filtres multiples (statut, catégorie, mot-clé, tri)
- Pagination, stats badges
- CRUD complet des demandes
- Gestion des offres (accepter/refuser/noter/contacter)
- Messagerie intégrée (polling 5s)

### 5. Notifications email
- 7 templates HTML responsives (welcome, newOffer, offerAccepted, offerRejected, newMessage, reviewReceived, offerCompleted)
- SMTP configurable, fallback console.log en dev

### 6. Géolocalisation
- Géocodage Nominatim (autocomplete + géolocalisation navigateur)
- Carte Leaflet OpenStreetMap sur les profils prestataires
- Filtrage par distance (Haversine + Bounding Box) dans la recherche
- Stockage lat/lng sur `ProviderProfile` et `ServiceRequest`

### 7. Mode sombre
- Toggle Sun/Moon, localStorage, préférence système
- Classes `dark:` sur tous les composants

### 8. Page d'accueil enrichie
- Compteurs stats en direct (prestataires, demandes, avis)
- Prestataires à la une (top 4 récents avec note)
- Témoignages clients (3 meilleurs avis)
- Traduit en fr + ar-tn

### 9. PWA / Mobile
- Service Worker offline (cache statique + assets)
- Manifest PWA (standalone, icônes 192/512)
- Responsive design amélioré

### 10. SEO
- `generateMetadata()` sur chaque page
- `sitemap.xml` dynamique (pages + profils prestataires)
- `robots.txt` (disallow dashboard/admin/api)

### 11. Tests
- **Vitest** : 52 tests unitaires (geo, utils, OTP, profil, statut d'offre, inscription, setup)
- **Playwright** : 17 tests E2E (navigation, pages, manifest, sitemap, parcours OTP)

### 12. Adaptation Tunisie + Arabe tunisien
- **Langue** : bascule FR ↔ العربية التونسية via bouton globe dans la Navbar
- **RTL** : direction automatique + classes CSS dédiées
- **419 traductions** en arabe tunisien (vocabulaire local : لقى, كيفاش, برشا, شنو)
- **Villes** : 24 municipalités tunisiennes
- **Téléphone** : format +216 XX XXX XXX
- **Prix** : TND / د.ت
- **Placeholders** : exemples tunisiens (Ahmed, مؤسسة فلان)

### 13. Vérification OTP (SMS / WhatsApp / email)

Voir la section dédiée [Vérification OTP](#vérification-otp) ci-dessous.

### 14. Abonnements prestataires
- Plans `FREE` / `PRO` / `PREMIUM` (table `Subscription`, 1-1 avec `User`)
- Quota d'offres mensuel (`offerTokens`) réinitialisé par `/api/cron/reset-tokens`
- Badge « vérifié » attribuable par l'administrateur

### 15. Portfolio prestataire
- Galeries d'images et de vidéos sur le profil public
- Liens réseaux sociaux (site, Facebook, Instagram, TikTok, LinkedIn, YouTube)
- Stockés en JSON dans `portfolioImages` / `portfolioVideos`

### 16. Notes vocales et génération IA
- Note vocale attachable à une demande (`ServiceRequest.audioUrl`)
- Génération assistée de la description d'une demande via Google Gemini (`GEMINI_API_KEY`)
- Sans clé API, la génération est simplement désactivée

---

## Vérification OTP

Le champ téléphone du formulaire d'inscription dépend du rôle choisi :

| Rôle | Champ téléphone | Validation |
|------|-----------------|------------|
| Client | Masqué (input, label et texte d'aide) | Aucune — tout numéro reçu est ignoré côté serveur |
| Prestataire | Affiché et **obligatoire** | Format international E.164, unicité en base |

Un prestataire est joignable par les clients : son numéro est donc requis. Un
client s'inscrit sans numéro et arrive directement au dashboard.

Lorsqu'un numéro est enregistré, l'utilisateur est redirigé vers `/verify-otp`
pour le vérifier — mais le dashboard reste accessible sans vérification : une
bannière de rappel s'affiche tant que le numéro n'est pas confirmé. Ce choix
évite de bloquer les comptes de démonstration créés par le seed, qui n'ont pas
de numéro.

### Parcours

```
/inscription  ──(prestataire : numéro requis)──▶  /verify-otp
     │                                        │
     │                                   ┌────┴────┐
     └──(client : sans numéro)─▶ dashboard│ Étape 1 │  choix du canal
                                │        │         │  SMS / WhatsApp / Email
                                │        └────┬────┘
                                │             ▼
                                │        ┌─────────┐
                                │        │ Étape 2 │  saisie du code à 6 chiffres
                                │        └────┬────┘
                                │             │
                                │        succès │ ▶ verifiedPhone = true
                                ▼             ▼
                          bannière de     dashboard
                          rappel          (bannière disparue)
```

L'utilisateur peut cliquer « Plus tard » à tout moment : il arrive alors au
dashboard avec la bannière, qui le ramène vers `/verify-otp`.

### Sécurité

| Mesure | Détail |
|---|---|
| Génération | Web Crypto (`getRandomValues`) + rejection sampling — pas de `Math.random()` |
| Stockage | Le code n'est jamais stocké en clair : hash bcrypt (coût 12) dans `Otp.otpHash` |
| Durée de vie | 10 minutes (`expiresAt`), purge des codes expirés à chaque envoi |
| Tentatives | 3 essais maximum par code (`Otp.attempts`) |
| Usage unique | Le code est supprimé après vérification, qu'elle réussisse ou non |
| Rate limiting | 5 envois par heure, comptés **à la fois** par cible et par IP |
| Normalisation | `toE164()` — une seule fonction canonique, partagée client et serveur |

Le rate limiting est en mémoire process : il suffit en développement et sur un
serveur unique, mais doit être remplacé par Redis/Upstash en déploiement
multi-instance (voir l'en-tête de `src/lib/utils/rate-limit.ts`).

### Format des numéros

Les numéros sont normalisés en **E.164** avant tout traitement :

| Saisie | Normalisé |
|---|---|
| `55123456` | `+21655123456` (préfixe tunisien implicite pour 8 chiffres) |
| `+216 55 123 456` | `+21655123456` |
| `0021655123456` | `+21655123456` |

### Canaux d'envoi

| Canal | Transport | Sans configuration |
|---|---|---|
| SMS | Twilio REST API (`TWILIO_PHONE_NUMBER`) | Code affiché dans la console serveur |
| WhatsApp | Twilio REST API (`TWILIO_WHATSAPP_FROM`) | Code affiché dans la console serveur |
| Email | Nodemailer SMTP | Code affiché dans la console serveur |

Sans identifiants Twilio, le flux reste **entièrement testable** : le code
apparaît dans la sortie du serveur sous la forme `[SMS OTP] To: … | Code: …`.

### Configuration

```env
TWILIO_ACCOUNT_SID=""      # laissez vide pour le mode console
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""     # expéditeur SMS, format E.164
TWILIO_WHATSAPP_FROM=""    # sandbox Twilio : +14155238886
```

---

## Installation

```bash
# Cloner et installer
git clone <url>
cd marketplace
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env : AUTH_SECRET est obligatoire (openssl rand -base64 32).
# SMTP, Twilio et Gemini sont facultatifs — sans eux, l'application
# retombe sur un affichage console et reste pleinement utilisable.

# Base de données
npx prisma generate
npx prisma migrate deploy   # ou `npx prisma db push` en itération rapide
npm run seed

# Lancer le développement
npm run dev

# Build production
npm run build
npm start
```

---

## Commandes

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (Turbopack) |
| `npm run build` | Build production |
| `npm start` | Serveur production |
| `npm run lint` | ESLint |
| `npm run seed` | Seed BDD (comptes démo) |
| `npm test` | Tests unitaires (Vitest) |
| `npm run test:watch` | Tests unitaires watch |
| `npm run test:e2e` | Tests E2E (Playwright) |
| `npx prisma studio` | Interface BDD |
| `npx prisma migrate dev` | Créer et appliquer une migration |
| `npx prisma migrate status` | Vérifier l'état des migrations |
| `npx playwright install` | Installer navigateurs E2E |

---

## Comptes de démonstration (seed)

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@test.com` | `password123` |
| Client | `client@test.com` | `password123` |
| Prestataire | `pro@test.com` | `password123` |

---

## Structure du projet

```
src/
├── app/                  # Pages Next.js App Router
│   ├── layout.tsx        # Layout racine (lang, theme, auth, PWA)
│   ├── page.tsx          # Page d'accueil
│   ├── manifest.ts       # PWA manifest
│   ├── robots.ts         # SEO robots.txt
│   ├── sitemap.ts        # SEO sitemap.xml
│   ├── connexion/        # Page de connexion
│   ├── inscription/      # Page d'inscription
│   ├── verify-otp/       # Vérification OTP (page serveur + formulaire client)
│   ├── prestataires/     # Recherche + profil prestataire
│   ├── dashboard/        # Dashboard client + prestataire
│   ├── admin/            # Administration
│   └── api/              # API routes (auth, upload, cron)
├── components/           # 35 composants React
├── lib/                  # Utilitaires
│   ├── actions/          # 13 Server Actions (auth, otp, admin, subscription…)
│   ├── api/twilio.ts     # Envoi SMS / WhatsApp (REST, fallback console)
│   ├── utils/otp.ts      # Génération, normalisation E.164
│   ├── utils/rate-limit.ts # Limitation par cible + IP
│   ├── i18n.ts           # Traductions fr/ar-tn (419 clés)
│   ├── email.ts          # Nodemailer + templates
│   ├── geo.ts            # Géocodage + distance
│   └── utils.ts          # cn(), CATEGORIES, villes TN, format
├── __tests__/            # Tests Vitest
├── auth.ts               # NextAuth config
├── proxy.ts              # Middleware
└── types/                # Types TypeScript
prisma/
├── schema.prisma         # Schéma BDD (12 tables)
├── migrations/           # Historique des migrations
└── seed.ts               # Données de démonstration
public/
├── sw.js                 # Service Worker PWA
├── icon-192.svg          # Icône PWA
└── icon-512.svg          # Icône PWA
e2e/
├── basic.spec.ts         # Tests Playwright — navigation, SEO, PWA
└── otp.spec.ts           # Tests Playwright — parcours de vérification
design/
└── specs/otp-flow.md     # Spécification produit du parcours OTP
```

---

## Déploiement

Le projet est configuré pour **Vercel** (`vercel.json` présent).
Voir `DEPLOY.md` pour les instructions détaillées.

Variables d'environnement requises :
- `DATABASE_URL` — URL de connexion PostgreSQL
- `AUTH_SECRET` — Clé secrète NextAuth (`openssl rand -base64 32`)
- `NEXTAUTH_URL` — URL de déploiement (lue par `robots.ts` et `sitemap.ts`)
- `NEXT_PUBLIC_URL` — URL publique utilisée dans les liens des emails

Variables facultatives (l'application démarre sans elles) :
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` — envoi d'emails
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` / `TWILIO_WHATSAPP_FROM` — OTP SMS et WhatsApp
- `GEMINI_API_KEY` — génération IA des descriptions de demandes
- `RESET_SECRET` — jeton attendu par `/api/cron/reset-tokens`

La liste complète et commentée se trouve dans `.env.example`.
