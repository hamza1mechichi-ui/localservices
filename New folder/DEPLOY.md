# Déploiement
# Pour Vercel : utiliser une base PostgreSQL (via Supabase ou Neon)
# 1. Créer une base PostgreSQL
# 2. Mettre à jour DATABASE_URL avec l'URL de connexion
# 3. Changer le provider Prisma de "sqlite" à "postgresql"
# 4. Déployer sur Vercel

# Variables d'environnement requises :
# DATABASE_URL=postgresql://...
# AUTH_SECRET=<generated secret>
# RESET_SECRET=<generated secret>
# AUTH_URL=https://votre-domaine.com
