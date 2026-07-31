import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Les mocks doivent être déclarés avant l'import du module testé : `vi.mock` est
// hoisté par Vitest, mais on garde l'ordre explicite pour la lisibilité.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    providerProfile: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// `revalidatePath` lève hors contexte de requête Next : on la neutralise.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { updateProviderProfile } from "@/lib/actions/profile";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/** Construit un FormData valide au regard de `providerProfileSchema`. */
function buildValidFormData(): FormData {
  const fd = new FormData();
  fd.append("businessName", "Test Business");
  fd.append("category", "Plomberie");
  fd.append("location", "Tunis");
  // avatarUrl est obligatoire dans le schéma.
  fd.append("avatarUrl", "https://example.com/avatar.jpg");
  fd.append("websiteUrl", "https://example.com");
  fd.append("facebookUrl", "https://facebook.com/example");
  fd.append("instagramUrl", "https://instagram.com/example");
  // Attention à la casse : l'action lit `tiktokUrl` et `linkedinUrl`.
  fd.append("tiktokUrl", "https://tiktok.com/@example");
  fd.append("linkedinUrl", "https://linkedin.com/in/example");
  fd.append("youtubeUrl", "https://youtube.com/example");
  fd.append("portfolioImages", "https://example.com/img1.jpg");
  fd.append("portfolioImages", "https://example.com/img2.jpg");
  fd.append("portfolioVideos", "https://example.com/video1.mp4");
  fd.append("portfolioVideos", "https://example.com/video2.mp4");
  return fd;
}

const mockedAuth = vi.mocked(auth);
const mockedUpdate = vi.mocked(prisma.providerProfile.update);

/** Session prestataire minimale ; `auth()` est typé large, un cast suffit ici. */
function providerSession(role: string = "PROVIDER") {
  return { user: { id: "test-user-id", role } } as unknown as Awaited<ReturnType<typeof auth>>;
}

describe("updateProviderProfile", () => {
  beforeEach(() => {
    mockedAuth.mockResolvedValue(providerSession());
    // La valeur de retour n'est pas inspectée par l'action : un objet vide suffit.
    mockedUpdate.mockResolvedValue({ id: "profile-1" } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("devrait mettre à jour le profil professionnel avec succès", async () => {
    const result = await updateProviderProfile(buildValidFormData());

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockedUpdate).toHaveBeenCalledTimes(1);
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { userId: "test-user-id" },
      data: expect.objectContaining({
        businessName: "Test Business",
        category: "Plomberie",
        location: "Tunis",
        avatarUrl: "https://example.com/avatar.jpg",
        websiteUrl: "https://example.com",
        facebookUrl: "https://facebook.com/example",
        instagramUrl: "https://instagram.com/example",
        tiktokUrl: "https://tiktok.com/@example",
        linkedinUrl: "https://linkedin.com/in/example",
        youtubeUrl: "https://youtube.com/example",
        // Les tableaux sont sérialisés en JSON (SQLite n'a pas de type liste).
        portfolioImages: JSON.stringify([
          "https://example.com/img1.jpg",
          "https://example.com/img2.jpg",
        ]),
        portfolioVideos: JSON.stringify([
          "https://example.com/video1.mp4",
          "https://example.com/video2.mp4",
        ]),
      }),
    });
  });

  it("devrait refuser un utilisateur qui n'est pas prestataire", async () => {
    mockedAuth.mockResolvedValue(providerSession("CLIENT"));

    const result = await updateProviderProfile(buildValidFormData());

    expect(result).toEqual({ success: false, error: "Non autorisé" });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("devrait refuser un visiteur non authentifié", async () => {
    mockedAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);

    const result = await updateProviderProfile(buildValidFormData());

    expect(result).toEqual({ success: false, error: "Non autorisé" });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("devrait retourner une erreur si les données sont invalides", async () => {
    const fd = new FormData();
    fd.append("businessName", "AB");
    fd.append("category", ""); // vide → invalide
    fd.append("location", "Tunis");
    fd.append("avatarUrl", "https://example.com/avatar.jpg");

    const result = await updateProviderProfile(fd);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.error).toContain("La catégorie est requise");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("devrait exiger une photo de profil", async () => {
    const fd = new FormData();
    fd.append("businessName", "Test Business");
    fd.append("category", "Plomberie");
    fd.append("location", "Tunis");
    // avatarUrl absent

    const result = await updateProviderProfile(fd);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.error).toContain("photo de profil");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("devrait gérer les erreurs inattendues de la base", async () => {
    mockedUpdate.mockRejectedValue(new Error("Erreur de base de données"));
    // L'action logge l'erreur : on tait la sortie pour garder le rapport lisible.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await updateProviderProfile(buildValidFormData());

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.error).toContain("Erreur lors de la mise à jour du profil");

    consoleSpy.mockRestore();
  });
});
