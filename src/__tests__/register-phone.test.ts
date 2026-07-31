import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Le téléphone n'est demandé qu'aux prestataires.
 *
 * Ces tests verrouillent la règle côté serveur : l'UI masque le champ pour un
 * client, mais `register` ne doit pas s'y fier — une requête forgée pourrait
 * sinon consommer un numéro, `phone` étant @unique.
 */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendTemplate: vi.fn(),
}));

import { register } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

function buildFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  return fd;
}

const BASE = {
  name: "Test User",
  email: "test@example.fr",
  password: "password123",
};

const PROVIDER_FIELDS = {
  businessName: "Entreprise Test",
  category: "Plomberie",
  location: "Tunis",
};

describe("register — téléphone conditionnel au rôle", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset().mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockReset();
  });

  /**
   * Fait renvoyer au mock de création l'utilisateur qui lui est passé.
   * `register` ne relit que `email`, `name` et `phone` : un objet partiel
   * suffit, d'où le cast — le type Prisma exigerait tous les champs.
   */
  function echoCreatedUser() {
    vi.mocked(prisma.user.create).mockImplementation(
      (args) => Promise.resolve({ id: "user-1", ...args.data }) as never
    );
  }

  /** Données passées à `prisma.user.create` lors du dernier appel. */
  function createdData(): { phone: string | null } {
    return vi.mocked(prisma.user.create).mock.calls[0][0].data as { phone: string | null };
  }

  it("crée un compte client sans téléphone", async () => {
    echoCreatedUser();
    const result = await register(buildFormData({ ...BASE, role: "CLIENT" }));

    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.phone).toBeNull();
  });

  it("ignore un téléphone soumis par un client (requête forgée)", async () => {
    echoCreatedUser();
    const result = await register(
      buildFormData({ ...BASE, role: "CLIENT", phone: "+21655123456" })
    );

    expect(result.success).toBe(true);
    expect(result.phone).toBeNull();
    // Le numéro ne doit pas être écrit : il resterait réservé par la contrainte @unique.
    expect(createdData().phone).toBeNull();
  });

  it("refuse un prestataire sans téléphone", async () => {
    const result = await register(
      buildFormData({ ...BASE, ...PROVIDER_FIELDS, role: "PROVIDER" })
    );

    expect(result.error).toBe("Le numéro de téléphone est obligatoire pour un prestataire");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("refuse un prestataire dont le téléphone n'est pas au format international", async () => {
    const result = await register(
      buildFormData({ ...BASE, ...PROVIDER_FIELDS, role: "PROVIDER", phone: "123" })
    );

    expect(result.error).toBe("Numéro de téléphone invalide");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("canonicalise en E.164 le numéro local d'un prestataire", async () => {
    echoCreatedUser();
    const result = await register(
      buildFormData({ ...BASE, ...PROVIDER_FIELDS, role: "PROVIDER", phone: "55 123 456" })
    );

    expect(result.error).toBeUndefined();
    expect(result.phone).toBe("+21655123456");
  });
});
