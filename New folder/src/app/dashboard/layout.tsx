import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tableau de bord - LocalServices",
  description: "Gérez vos demandes, devis et profil sur LocalServices.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
