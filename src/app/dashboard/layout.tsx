import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PhoneVerificationBanner } from "@/components/PhoneVerificationBanner";

export const metadata: Metadata = {
  title: "Tableau de bord - LocalServices",
  description: "Gérez vos demandes, devis et profil sur LocalServices.",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Rappel non bloquant : le dashboard reste accessible sans numéro vérifié.
  // On n'affiche la bannière que si un numéro existe mais n'est pas confirmé.
  let unverifiedPhone: string | null = null;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true, verifiedPhone: true },
    });
    if (user?.phone && !user.verifiedPhone) unverifiedPhone = user.phone;
  }

  return (
    <div>
      {unverifiedPhone && <PhoneVerificationBanner phone={unverifiedPhone} />}
      {children}
    </div>
  );
}
