"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendTemplate } from "@/lib/email";

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  role: z.enum(["CLIENT", "PROVIDER"]),
  businessName: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
});

// Crée le compte uniquement. La connexion elle-même est faite côté client
// (via next-auth/react `signIn`) juste après, pour que SessionProvider mette
// à jour son état immédiatement sans dépendre d'un nouveau rendu serveur du
// layout racine (voir LoginForm.tsx pour l'explication complète).
export async function register(formData: FormData) {
  const rawLat = formData.get("lat") as string | null;
  const rawLng = formData.get("lng") as string | null;
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as "CLIENT" | "PROVIDER",
    businessName: formData.get("businessName") as string | null,
    category: formData.get("category") as string | null,
    location: formData.get("location") as string | null,
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

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      hashedPassword,
      role: data.role,
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

  return { success: true };
}
