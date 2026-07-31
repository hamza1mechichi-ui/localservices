# LocalServices — Marketplace de services locaux

Plateforme de mise en relation entre clients et professionnels de services.
Adaptée aux **normes tunisiennes** avec support du **français** et de **l'arabe tunisien** (RTL).

---

## Stack technique

```
Frontend : Next.js 16 (App Router, Turbopack) + TypeScript 5 + Tailwind CSS v4
Backend  : Next.js Server Actions + Prisma ORM 7.8
Database : SQLite (dev) → PostgreSQL (prod via Supabase/Neon)
Auth     : NextAuth v5 (Credentials provider, JWT)
Maps     : Leaflet + OpenStreetMap + Nominatim
Email    : Nodemailer (SMTP)
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
│  │ 332 clés │  │Nominatim │  │Nodemailer│  │ cn, format, etc │   │
│  │ fr/ar-tn │  │Haversine │  │7 templates│  │ CATEGORIES,     │   │
│  │ RTL      │  │ BBox     │  │          │  │ villes TN       │   │
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
│  ┌───────────────┐  ┌────────────┐  ┌───────────────┐             │
│  │FavoriteProvid │  │Category    │  │Subscription   │             │
│  │     er        │  │            │  │               │             │
│  └───────────────┘  └────────────┘  └───────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Modèle de données (10 tables)

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
```

---

## Routes et pages

| Route | Type | Description |
|---|---|---|
| `/` | Server | Page d'accueil enrichie (hero, stats, comment ça marche, prestataires à la une, témoignages, CTA) |
| `/connexion` | Server | Connexion |
| `/inscription` | Server | Inscription (client ou prestataire) |
| `/prestataires` | Client | Recherche et liste des prestataires (filtres, pagination, favoris) |
| `/prestataires/[id]` | Server | Profil public prestataire (infos, carte Leaflet, avis, favoris) |
| `/dashboard/client` | Client | Dashboard client (demandes CRUD, offres, favoris, messagerie, paramètres) |
| `/dashboard/prestataire` | Client | Dashboard prestataire (browse demandes, offres, avis, messagerie, abonnement) |
| `/admin` | Client | Administration (stats avancées, catégories CRUD, modération avis) |
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
- **Vitest** : 9 tests unitaires (geo, utils, setup)
- **Playwright** : 7 tests E2E (navigation, pages, manifest, sitemap)

### 12. Adaptation Tunisie + Arabe tunisien
- **Langue** : bascule FR ↔ العربية التونسية via bouton globe dans la Navbar
- **RTL** : direction automatique + classes CSS dédiées
- **332 traductions** en arabe tunisien (vocabulaire local : لقى, كيفاش, برشا, شنو)
- **Villes** : 24 municipalités tunisiennes
- **Téléphone** : format +216 XX XXX XXX
- **Prix** : TND / د.ت
- **Placeholders** : exemples tunisiens (Ahmed, مؤسسة فلان)

---

## Installation

```bash
# Cloner et installer
git clone <url>
cd marketplace
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env si nécessaire (SMTP, etc.)

# Base de données
npx prisma generate
npx prisma db push
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
│   ├── prestataires/     # Recherche + profil prestataire
│   ├── dashboard/        # Dashboard client + prestataire
│   ├── admin/            # Administration
│   └── api/              # API routes (auth, upload, cron)
├── components/           # 19 composants React
├── lib/                  # Utilitaires
│   ├── actions/          # 11 Server Actions
│   ├── i18n.ts           # Traductions fr/ar-tn
│   ├── email.ts          # Nodemailer + templates
│   ├── geo.ts            # Géocodage + distance
│   └── utils.ts          # cn(), CATEGORIES, villes TN, format
├── __tests__/            # Tests Vitest
├── auth.ts               # NextAuth config
├── proxy.ts              # Middleware
└── types/                # Types TypeScript
prisma/
├── schema.prisma         # Schéma BDD (10 tables)
└── seed.ts               # Données de démonstration
public/
├── sw.js                 # Service Worker PWA
├── icon-192.svg          # Icône PWA
└── icon-512.svg          # Icône PWA
e2e/
└── basic.spec.ts         # Tests Playwright
```

---

## Déploiement

Le projet est configuré pour **Vercel** (`vercel.json` présent).
Voir `DEPLOY.md` pour les instructions détaillées.

Variables d'environnement requises :
- `DATABASE_URL` — URL de connexion PostgreSQL
- `NEXTAUTH_SECRET` — Clé secrète NextAuth
- `NEXTAUTH_URL` — URL de déploiement
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — SMTP emails
- `CRON_SECRET` — Secret pour l'endpoint CRON
