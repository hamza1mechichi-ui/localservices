import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter }) as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const mediaMimeTypes = {
  images: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  videos: ["video/mp4", "video/mpeg", "video/quicktime", "video/webm", "video/x-msvideo", "video/x-flv"],
} as const;

type MediaMimeTypes = typeof mediaMimeTypes;

type MimeTypeCategory<K extends keyof MediaMimeTypes> = MediaMimeTypes[K][number];

type AllowedMimeTypes = MimeTypeCategory<keyof MediaMimeTypes>;

export type { AllowedMimeTypes };
