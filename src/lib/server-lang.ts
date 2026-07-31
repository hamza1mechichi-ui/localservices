import { cookies } from "next/headers";
import type { Lang } from "./i18n";

export async function getServerLang(): Promise<Lang> {
  return ((await cookies()).get("lang")?.value as Lang) || "fr";
}
