"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function updateAccountSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const name = formData.get("name") as string;
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!name || name.length < 2) return { error: "Le nom doit contenir au moins 2 caractères" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) return { error: "Utilisateur introuvable" };

  if (currentPassword && newPassword) {
    if (newPassword.length < 6) return { error: "Le nouveau mot de passe doit contenir au moins 6 caractères" };
    const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isValid) return { error: "Mot de passe actuel incorrect" };
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, hashedPassword },
    });
  } else {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
    });
  }

  revalidatePath("/dashboard");
  return { success: "Compte mis à jour" };
}
