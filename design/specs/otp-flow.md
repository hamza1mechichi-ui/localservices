# Spécification : Flux d'Authentification à Double Canal (OTP)

## Contexte

Système de vérification à double canal (Email & Téléphone via SMS/WhatsApp) avec code OTP à 6 chiffres pour la plateforme **LocalServices**.

---

## Architecture

### Modèle de Données (Prisma)

```prisma
model OTP {
  id            String   @id @default(cuid())
  target        String   // Email ou numéro de téléphone
  channel       String   // "email" | "sms" | "whatsapp"
  otpHash       String   // Haché avec bcrypt (cost=12)
  expiresAt     DateTime // Expiration à 10 minutes
  attempts      Int      @default(0)
  type          String   // Type du canal (email/sms/whatsapp)
  userId        String   // Référence vers l'utilisateur

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([target, channel])
  @@index([expiresAt])
}
```

### Modifications au modèle User

```prisma
model User {
  // ...champs existants
  phone         String?   // Numéro E.164 stocké après vérification
  verifiedPhone Boolean   @default(false)
  emailVerified DateTime? // Date de vérification email
  otps          OTP[]     // Relation vers les OTP
}
```

---

## Flux de Travail

### Étape 1 : Saisie des Informations
- Formulaire d'inscription avec :
  - Nom complet
  - Email
  - Mot de passe
  - **Prestataire uniquement** : téléphone (format E.164, obligatoire), nom
    d'entreprise, catégorie, localisation

Le champ téléphone n'est ni affiché ni exigé pour un client : le rôle Client
s'inscrit sans numéro et ne passe donc pas par la vérification OTP.

### Étape 2 : Choix du Canal de Vérification
- L'utilisateur choisit :
  - 📧 Email
  - 📱 SMS
  - 💬 WhatsApp

### Étape 3 : Saisie du Code OTP
- Interface 6 cases avec :
  - Auto-focus sur la case suivante
  - Compte à rebours (60 secondes)
  - Gestion des erreurs (code expiré, incorrect, tentatives max)
  - Bouton "Renvoyer le code"

### Étape 4 : Activation du Compte
- Après vérification réussie :
  - Le compte est activé
  - Redirection vers le dashboard

---

## Sécurité

### Hachage des Codes OTP
- **bcrypt** avec un coût de 12
- Les codes ne sont jamais stockés en clair

### Rate Limiting
- **5 tentatives maximum** par heure par cible (email/téléphone)
- Stockage en mémoire (peut être migré vers Redis)

### Expiration
- Les codes OTP expirent au bout de **10 minutes**
- Nettoyage automatique des codes expirés

### Tentatives
- Maximum **3 tentatives** par code
- Après 3 échecs, le code est invalidé

---

## Intégrations API

### Email (Resend)
```ts
// src/lib/api/email.ts
await resend.emails.send({
  from: "accounts@localservices.tn",
  to: target,
  subject: "Votre code de vérification LocalServices",
  html: "<template OTP>"
});
```

### SMS (Twilio)
```ts
// src/lib/api/twilio.ts
await client.messages.create({
  body: "LocalServices — Votre code : 123456",
  to: "+21655123456",
  from: process.env.TWILIO_PHONE_NUMBER
});
```

### WhatsApp (Twilio API)
```ts
// src/lib/api/twilio.ts
await client.messages.create({
  body: "📱 LocalServices — Votre code : 123456",
  to: "whatsapp:+21655123456",
  from: "whatsapp:+1234567890"
});
```

---

## Internationalisation

### Langues Supportées
- **Français (fr)**
- **Arabe Tunisien (ar-tn)**

### Clés i18n
```ts
"otp.title": { fr: "Code de vérification", "ar-tn": "رمز التحقق" },
"otp.subtitle": { fr: "Entrez le code de 6 chiffres...", "ar-tn": "أدخل رمز التحقق..." },
"otp.channel.email": { fr: "Email", "ar-tn": "البريد الإلكتروني" },
"otp.channel.sms": { fr: "SMS", "ar-tn": "رسالة نصية" },
"otp.channel.whatsapp": { fr: "WhatsApp", "ar-tn": "واتساب" },
"otp.countdown": { fr: "Renvoyer dans {{seconds}} secondes", "ar-tn": "أعد الإرسال في {{seconds}} ثانية" },
```

---

## Variables d'Environnement

```env
# Twilio
TWILIO_SID=
TWILIO_TOKEN=
TWILIO_PHONE_NUMBER=

# Resend
RESEND_API_KEY=
RESEND_FROM=noreply@localservices.tn

# WhatsApp (Meta Cloud API)
META_ACCESS_TOKEN=
META_PHONE_NUMBER_ID=

# OTP
OTP_SALT_COST=12
```

---

## Tests

### Tests Unitaires
- Génération OTP
- Validation E.164
- Rate limiting
- Formatage téléphone

### Tests d'Intégration
- Envoi OTP par email/SMS
- Vérification OTP correcte/incorrecte
- Gestion des tentatives

### Tests E2E
- Flux complet d'inscription avec OTP
- Gestion des erreurs

---

## Fichiers Clés

| Fichier | Description |
|---------|-------------|
| `prisma/schema.prisma` | Modèle OTP |
| `src/lib/actions/otp.ts` | Actions serveur |
| `src/lib/api/email.ts` | Wrapper Resend |
| `src/lib/api/twilio.ts` | Wrapper Twilio |
| `src/lib/utils/otp.ts` | Utilitaires OTP |
| `src/lib/utils/rate-limit.ts` | Rate limiting |
| `src/components/OTPVerificationModal.tsx` | Modal OTP |
| `src/app/verify-otp/page.tsx` | Route de vérification |
| `src/app/verify-otp/OTPInputForm.tsx` | Formulaire OTP |
| `src/__tests__/otp.test.ts` | Tests |
