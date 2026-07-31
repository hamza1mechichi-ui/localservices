"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendTemplate } from "@/lib/email";
import { isValidE164, toE164 } from "@/lib/utils/otp";

const registerSchema = z
  .object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    role: z.enum(["CLIENT", "PROVIDER"]),
    businessName: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  })
  // Le téléphone n'est demandé qu'aux prestataires : il sert à être joint par les
  // clients. Un compte client peut donc s'inscrire sans numéro.
  .superRefine((data, ctx) => {
    if (data.role === "PROVIDER") {
      if (!data.phone) {
        ctx.addIssue({
          code: "custom",
          path: ["phone"],
          message: "Le numéro de téléphone est obligatoire pour un prestataire",
        });
        return;
      }
      if (!isValidE164(data.phone)) {
        ctx.addIssue({ code: "custom", path: ["phone"], message: "Numéro de téléphone invalide" });
      }
    }
  });

// Crée le compte uniquement. La connexion elle-même est faite côté client
// (via next-auth/react `signIn`) juste après, pour que SessionProvider mette
// à jour son état immédiatement sans dépendre d'un nouveau rendu serveur du
// layout racine (voir LoginForm.tsx pour l'explication complète).
export async function register(formData: FormData) {
  const rawLat = formData.get("lat") as string | null;
  const rawLng = formData.get("lng") as string | null;
  const role = formData.get("role") as "CLIENT" | "PROVIDER";
  const rawPhone = (formData.get("phone") as string | null)?.trim();
  // Le formulaire envoie la saisie brute : on canonicalise côté serveur pour
  // que la contrainte d'unicité porte toujours sur la même forme. Pour un
  // client, le champ n'est pas affiché : tout numéro reçu est ignoré, sans
  // quoi une requête forgée pourrait consommer un numéro (contrainte @unique).
  const phone = role === "PROVIDER" && rawPhone ? toE164(rawPhone) : null;

  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role,
    businessName: formData.get("businessName") as string | null,
    category: formData.get("category") as string | null,
    location: formData.get("location") as string | null,
    phone,
  };

  const validated = registerSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    return { error: "Un compte avec cet email existe déjà" };
  }

  if (phone) {
    // `phone` est @unique : on vérifie explicitement pour renvoyer un message
    // clair plutôt qu'une erreur de contrainte Prisma.
    const phoneTaken = await prisma.user.findUnique({ where: { phone } });
    if (phoneTaken) {
      return { error: "Ce numéro de téléphone est déjà utilisé" };
    }
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      hashedPassword,
      role: data.role,
      phone,
      ...(data.role === "PROVIDER" && data.businessName && data.category && data.location
        ? {
            providerProfile: {
              create: {
                businessName: data.businessName,
                category: data.category,
                location: data.location,
                lat: rawLat ? parseFloat(rawLat) : null,
                lng: rawLng ? parseFloat(rawLng) : null,
                offerTokens: 5,
              },
            },
          }
        : {}),
    },
  });

  sendTemplate("welcome", user.email, user.name);

  // `phone` est remonté au client : s'il est présent, le formulaire enchaîne sur
  // /verify-otp au lieu d'aller directement au dashboard.
  return { success: true, phone: user.phone ?? null };
}
