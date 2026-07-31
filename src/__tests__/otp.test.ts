import { describe, it, expect, vi, beforeEach } from "vitest";
import * as otpUtils from "@/lib/utils/otp";
import { generateOTP, isValidE164, normalizeE164, formatTNPhone, toE164 } from "@/lib/utils/otp";
import {
  isRateLimited,
  resetRateLimit,
  isAnyRateLimited,
  otpRateLimitKeys,
} from "@/lib/utils/rate-limit";
import { prisma } from "@/lib/prisma";
import { sendOTPAction, verifyOTPAction } from "@/lib/actions/otp";

describe("OTP Utils", () => {
  describe("generateOTP", () => {
    it("devrait générer un code à 6 chiffres", () => {
      const code = generateOTP();
      expect(code).toMatch(/^\d{6}$/);
    });

    it("devrait générer des codes différents", () => {
      const codes = new Set([generateOTP(), generateOTP(), generateOTP()]);
      expect(codes.size).toBe(3);
    });

    it("devrait toujours produire 6 caractères, y compris pour les petites valeurs", () => {
      // 500 tirages : garantit qu'un code comme "42" est bien rendu "000042".
      for (let i = 0; i < 500; i++) {
        expect(generateOTP()).toHaveLength(6);
      }
    });
  });

  describe("isValidE164", () => {
    it("valide les numéros E.164 valides", () => {
      expect(isValidE164("+21655123456")).toBe(true);
      expect(isValidE164("+33612345678")).toBe(true);
      expect(isValidE164("+14155552671")).toBe(true);
    });

    it("rejette les numéros invalides", () => {
      expect(isValidE164("21655123456")).toBe(false); // Pas de +
      expect(isValidE164("+2165512345")).toBe(false); // Trop court
      expect(isValidE164("+0123456789")).toBe(false); // Code pays invalide
    });
  });

  describe("normalizeE164", () => {
    it("supprime les espaces et caractères", () => {
      expect(normalizeE164("+216 55 123 456")).toBe("+21655123456");
      expect(normalizeE164("(+216) 55-123-456")).toBe("+21655123456");
    });
  });

  describe("formatTNPhone", () => {
    it("formate correctement les numéros tunisiens", () => {
      expect(formatTNPhone("22123456")).toBe("+21622123456");
      expect(formatTNPhone("55123456")).toBe("+21655123456");
    });

    it("laisse passer les numéros déjà formatés", () => {
      expect(formatTNPhone("+21655123456")).toBe("+21655123456");
    });
  });

  describe("toE164", () => {
    it("normalise les formes locales tunisiennes", () => {
      expect(toE164("55 123 456")).toBe("+21655123456");
      expect(toE164("  22-12-34-56 ")).toBe("+21622123456");
    });

    it("normalise les formes internationales", () => {
      expect(toE164("+216 55-123-456")).toBe("+21655123456");
      expect(toE164("0021655123456")).toBe("+21655123456");
    });

    it("est idempotent", () => {
      const once = toE164("55 123 456");
      expect(toE164(once)).toBe(once);
    });
  });
});

describe("Rate Limiting", () => {
  beforeEach(() => {
    resetRateLimit("test-key");
  });

  it("devrait permettre jusqu'à 5 tentatives", () => {
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited("test-key")).toBe(false);
    }
  });

  it("devrait bloquer après 5 tentatives", () => {
    for (let i = 0; i < 5; i++) isRateLimited("test-key");
    expect(isRateLimited("test-key")).toBe(true);
  });

  it("devrait réinitialiser correctement", () => {
    for (let i = 0; i < 6; i++) isRateLimited("test-key");
    resetRateLimit("test-key");
    expect(isRateLimited("test-key")).toBe(false);
  });

  describe("otpRateLimitKeys", () => {
    it("produit une clé cible seule sans IP", () => {
      expect(otpRateLimitKeys("sms", "+21655123456", null)).toEqual([
        "otp:target:sms:+21655123456",
      ]);
    });

    it("produit une clé cible et une clé IP", () => {
      expect(otpRateLimitKeys("sms", "+21655123456", "10.0.0.1")).toEqual([
        "otp:target:sms:+21655123456",
        "otp:ip:10.0.0.1",
      ]);
    });
  });

  describe("isAnyRateLimited", () => {
    it("incrémente toutes les clés, sans court-circuit", () => {
      const keys = ["multi-a", "multi-b"];
      keys.forEach(resetRateLimit);

      // La clé A est déjà saturée avant l'appel groupé.
      for (let i = 0; i < 6; i++) isRateLimited("multi-a");
      expect(isAnyRateLimited(keys)).toBe(true);

      // multi-b doit néanmoins avoir été compté : 1 (ici) + 4 = 5 autorisés, le 6e bloque.
      for (let i = 0; i < 4; i++) expect(isRateLimited("multi-b")).toBe(false);
      expect(isRateLimited("multi-b")).toBe(true);

      keys.forEach(resetRateLimit);
    });

    it("bloque dès qu'une seule clé dépasse", () => {
      const keys = ["single-a", "single-b"];
      keys.forEach(resetRateLimit);
      for (let i = 0; i < 6; i++) isRateLimited("single-b");
      expect(isAnyRateLimited(keys)).toBe(true);
      keys.forEach(resetRateLimit);
    });
  });
});

describe("OTP Actions", () => {
  beforeEach(async () => {
    // Nettoyer les OTPs expirés
    await prisma.otp.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  });

  describe("sendOTPAction", () => {
    it("devrait envoyer un OTP par email", async () => {
      const result = await sendOTPAction("test@example.com", "email");
      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeDefined();
    });

    it("devrait envoyer un OTP par SMS", async () => {
      const result = await sendOTPAction("+21655123456", "sms");
      expect(result.success).toBe(true);
    });

    it("devrait rejeter les numéros invalides", async () => {
      const result = await sendOTPAction("invalid-phone", "sms");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Numéro de téléphone invalide");
    });

    it("devrait appliquer le rate limiting", async () => {
      const key = "rate-limited-target";
      for (let i = 0; i < 5; i++) {
        await sendOTPAction(key, "email");
      }
      const result = await sendOTPAction(key, "email");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Trop de tentatives");
    });
  });

  describe("verifyOTPAction", () => {
    it("devrait vérifier un code correct", async () => {
      const target = "verify-test@example.com";
      const spy = vi.spyOn(otpUtils, "generateOTP").mockReturnValue("123456");
      await sendOTPAction(target, "email");

      const result = await verifyOTPAction(target, "123456", "email");
      expect(result.success).toBe(true);
      spy.mockRestore();
    });

    it("devrait rejeter un code incorrect", async () => {
      const target = "verify-wrong@example.com";
      await sendOTPAction(target, "email");

      const result = await verifyOTPAction(target, "000000", "email");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Code incorrect");
    });

    it("devrait gérer les tentatives échouées", async () => {
      const target = "verify-attempts@example.com";
      await sendOTPAction(target, "email");

      // 3 tentatives incorrectes
      for (let i = 0; i < 3; i++) {
        await verifyOTPAction(target, "000000", "email");
      }

      const result = await verifyOTPAction(target, "111111", "email");
      expect(result.error).toBe("Trop de tentatives. Demandez un nouveau code.");
    });

    it("devrait consommer le code après un succès", async () => {
      const target = "verify-consume@example.com";
      const spy = vi.spyOn(otpUtils, "generateOTP").mockReturnValue("123456");
      await sendOTPAction(target, "email");
      spy.mockRestore();

      expect((await verifyOTPAction(target, "123456", "email")).success).toBe(true);

      // Le même code ne doit plus être rejouable.
      const replay = await verifyOTPAction(target, "123456", "email");
      expect(replay.success).toBe(false);
      expect(replay.error).toBe("Code expiré ou invalide");
    });

    it("devrait marquer verifiedPhone quand l'OTP est rattaché à un compte", async () => {
      const user = await prisma.user.create({
        data: {
          email: `otp-user-${Date.now()}@example.com`,
          name: "OTP Test",
          hashedPassword: "x",
          role: "CLIENT",
        },
      });
      const phone = "+21698765432";

      const spy = vi.spyOn(otpUtils, "generateOTP").mockReturnValue("654321");
      await sendOTPAction(phone, "sms", user.id);
      spy.mockRestore();

      const result = await verifyOTPAction(phone, "654321", "sms");
      expect(result.success).toBe(true);
      expect(result.userId).toBe(user.id);

      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated?.verifiedPhone).toBe(true);

      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});