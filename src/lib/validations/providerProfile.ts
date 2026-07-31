import { z } from "zod";

/**
 * Schéma de validation pour le profil professionnel du prestataire.
 * Inclut les champs existants et les nouveaux champs médias/réseaux sociaux.
 */
export const providerProfileSchema = z.object({
  // Champs existants
  businessName: z.string().min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères"),
  category: z.string().min(1, "La catégorie est requise"),
  location: z.string().min(1, "La localisation est requise"),
  description: z.string().optional(),
  phone: z.string().optional(),

  // Photo de profil (obligatoire)
  avatarUrl: z.string().min(1, "La photo de profil est obligatoire"),

  // Liens sociaux (optionnels mais valides si renseignés)
  websiteUrl: z.string().url("URL du site web invalide").optional().or(z.literal("")),
  facebookUrl: z.string().url("URL Facebook invalide").optional().or(z.literal("")),
  instagramUrl: z.string().url("URL Instagram invalide").optional().or(z.literal("")),
  tiktokUrl: z.string().url("URL TikTok invalide").optional().or(z.literal("")),
  linkedinUrl: z.string().url("URL LinkedIn invalide").optional().or(z.literal("")),
  youtubeUrl: z.string().url("URL YouTube invalide").optional().or(z.literal("")),

  // Galerie média
  portfolioImages: z.array(z.string().url("URL d'image invalide")).optional(),
  portfolioVideos: z.array(z.string().url("URL vidéo invalide")).optional(),
});

export type ProviderProfileFormData = z.infer<typeof providerProfileSchema>;