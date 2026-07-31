import { auth } from "@/auth";

export type Role = "CLIENT" | "PROVIDER" | "ADMIN";

export class AuthError extends Error {}

/**
 * Vérifie que l'utilisateur est connecté et possède l'un des rôles autorisés.
 * Lève une AuthError sinon (à capturer dans un try/catch et convertir en `fail(...)`).
 */
export async function requireRole<R extends Role>(...roles: R[]) {
  const session = await auth();
  if (!session?.user) throw new AuthError("Vous devez être connecté");
  if (!roles.includes(session.user.role as R)) {
    throw new AuthError("Action non autorisée pour ce rôle");
  }
  return session.user as { id: string; role: R; name?: string | null; email?: string | null };
}
