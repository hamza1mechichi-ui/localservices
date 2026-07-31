import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trouver un prestataire - LocalServices",
  description: "Recherchez parmi tous les prestataires de services locaux par catégorie, localisation ou mot-clé.",
};

export default function PrestatairesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
