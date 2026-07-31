"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireRole, AuthError } from "@/lib/require-role";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { z } from "zod";

const inputSchema = z.object({
  keywords: z.string().min(3, "Décrivez votre besoin en quelques mots").max(300),
  lang: z.enum(["fr", "ar-tn"]),
});

export interface AiSuggestion {
  title: string;
  description: string;
}

/**
 * Génère un titre + une description professionnels à partir de quelques
 * mots-clés fournis par le client, via le palier gratuit de l'API Gemini
 * (modèle gemini-2.5-flash — https://ai.google.dev/pricing, aucune carte
 * bancaire requise pour la clé "Free Tier" obtenue sur Google AI Studio).
 *
 * Variable d'environnement requise : GEMINI_API_KEY
 */
export async function generateRequestText(
  keywords: string,
  lang: "fr" | "ar-tn"
): Promise<ActionResult<AiSuggestion>> {
  try {
    await requireRole("CLIENT");
  } catch (e) {
    return fail(e instanceof AuthError ? e.message : "Non autorisé");
  }

  const parsed = inputSchema.safeParse({ keywords, lang });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[generateRequestText] GEMINI_API_KEY manquante dans .env");
    return fail("Assistant IA indisponible pour le moment");
  }

  const langLabel = parsed.data.lang === "ar-tn" ? "arabe tunisien (dialecte, pas arabe classique)" : "français";

  const prompt = `Tu aides un client tunisien à publier une demande de service sur une marketplace (LocalServices).
À partir de ces mots-clés : "${parsed.data.keywords}"

Génère UNIQUEMENT un objet JSON valide (rien d'autre, pas de markdown) avec exactement ces deux champs :
{"title": "un titre court et clair (max 8 mots)", "description": "une description professionnelle et détaillée (2-4 phrases) qui aidera les prestataires à comprendre le besoin"}

Langue à utiliser : ${langLabel}.
Reste factuel, n'invente pas de détails non mentionnés par le client.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsedResult = JSON.parse(text) as Partial<AiSuggestion>;

    if (!parsedResult.title || !parsedResult.description) {
      return fail("Réponse de l'IA incomplète, réessayez");
    }

    return ok({ title: parsedResult.title, description: parsedResult.description });
  } catch (e) {
    console.error("[generateRequestText]", e);
    return fail("L'assistant IA n'a pas pu générer de texte, réessayez ou saisissez manuellement");
  }
}
