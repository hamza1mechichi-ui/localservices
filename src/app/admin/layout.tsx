import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration - LocalServices",
  description: "Panneau d'administration : statistiques, catégories, modération des avis.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
