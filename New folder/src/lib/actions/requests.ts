"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { requireRole, AuthError } from "@/lib/require-role";
import { bboxAround, haversineKm } from "@/lib/geo";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createRequestSchema = z.object({
  title: z.string().min(5, "Le titre doit contenir au moins 5 caractères"),
  description: z.string().min(20, "La description doit contenir au moins 20 caractères"),
  category: z.string().min(1, "La catégorie est requise"),
  location: z.string().min(1, "La localisation est requise"),
  estimatedBudget: z.string().optional(),
});

const updateRequestSchema = z.object({
  title: z.string().min(5, "Le titre doit contenir au moins 5 caractères"),
  description: z.string().min(20, "La description doit contenir au moins 20 caractères"),
  category: z.string().min(1, "La catégorie est requise"),
  location: z.string().min(1, "La localisation est requise"),
  estimatedBudget: z.string().optional(),
});

export async function createServiceRequest(formData: FormData) {
  let user;
  try {
    user = await requireRole("CLIENT");
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Non autorisé" };
  }

  const rawBudget = formData.get("estimatedBudget") as string;
  const rawImages = formData.get("images") as string | null;
  const rawAudioUrl = formData.get("audioUrl") as string | null;
  const rawLat = formData.get("lat") as string | null;
  const rawLng = formData.get("lng") as string | null;
  const data = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    category: formData.get("category") as string,
    location: formData.get("location") as string,
    estimatedBudget: rawBudget,
  };

  const validated = createRequestSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const budgetValue = rawBudget ? parseFloat(rawBudget) : null;
  let imagesValue: string | undefined;
  if (rawImages) {
    try { JSON.parse(rawImages); imagesValue = rawImages; } catch {}
  }

  const latValue = rawLat ? parseFloat(rawLat) : null;
  const lngValue = rawLng ? parseFloat(rawLng) : null;
  // Ne fait confiance qu'aux chemins renvoyés par notre propre route d'upload
  // (le FormData vient du client, donc potentiellement manipulé).
  const audioUrlValue = rawAudioUrl && rawAudioUrl.startsWith("/uploads/") ? rawAudioUrl : null;

  await prisma.serviceRequest.create({
    data: {
      clientId: user.id,
      title: data.title,
      description: data.description,
      category: data.category,
      location: data.location,
      estimatedBudget: budgetValue && !isNaN(budgetValue) ? budgetValue : null,
      images: imagesValue,
      audioUrl: audioUrlValue,
      lat: latValue && !isNaN(latValue) ? latValue : null,
      lng: lngValue && !isNaN(lngValue) ? lngValue : null,
    },
  });

  revalidatePath("/dashboard/client");
  return { success: "Demande publiée avec succès" };
}

export async function closeServiceRequest(requestId: string) {
  let user;
  try {
    user = await requireRole("CLIENT");
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Non autorisé" };
  }

  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.clientId !== user.id) {
    return { error: "Demande introuvable" };
  }

  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: { status: "CLOSED" },
  });

  revalidatePath("/dashboard/client");
  return { success: "Demande clôturée" };
}

export async function getOpenRequests(params?: {
  category?: string;
  location?: string;
  search?: string;
  sort?: "recent" | "budget_asc" | "budget_desc";
  budgetMin?: number;
  budgetMax?: number;
  page?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}) {
  const where: Prisma.ServiceRequestWhereInput = { status: "OPEN" };
  if (params?.category) where.category = params.category;
  if (params?.location) where.location = { contains: params.location };
  if (params?.search) {
    where.OR = [
      { title: { contains: params.search } },
      { description: { contains: params.search } },
    ];
  }
  if (params?.budgetMin !== undefined || params?.budgetMax !== undefined) {
    where.estimatedBudget = {};
    if (params.budgetMin !== undefined) where.estimatedBudget.gte = params.budgetMin;
    if (params.budgetMax !== undefined) where.estimatedBudget.lte = params.budgetMax;
  }

  if (params?.lat != null && params?.lng != null && params?.radiusKm != null) {
    const bbox = bboxAround(params.lat, params.lng, params.radiusKm);
    where.lat = { gte: bbox.minLat, lte: bbox.maxLat };
    where.lng = { gte: bbox.minLng, lte: bbox.maxLng };
  }

  let orderBy: Prisma.ServiceRequestOrderByWithRelationInput = { createdAt: "desc" };
  if (params?.sort === "budget_asc") orderBy = { estimatedBudget: "asc" };
  else if (params?.sort === "budget_desc") orderBy = { estimatedBudget: "desc" };

  const page = params?.page ?? 1;
  const pageSize = 10;
  const [data, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      include: {
        client: { select: { name: true, id: true } },
        offers: { select: { providerId: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  let filtered = data;
  if (params?.lat != null && params?.lng != null && params?.radiusKm != null) {
    filtered = data.filter(
      (r) => r.lat != null && r.lng != null && haversineKm(params.lat!, params.lng!, r.lat, r.lng) <= params.radiusKm!
    );
  }

  // NOTE: see getMyFavorites-adjacent searchProviders() for the same caveat —
  // geo-radius filtering runs after DB pagination, so it only approximates the
  // true total for that case. Non-geo-filtered totals use the exact DB count.
  const isGeoFiltered = params?.lat != null && params?.lng != null && params?.radiusKm != null;
  const realTotal = isGeoFiltered ? filtered.length : total;
  return { data: filtered, total: realTotal, page, pageSize, totalPages: Math.ceil(realTotal / pageSize) };
}

export async function getMyRequests(params?: {
  status?: string;
  category?: string;
  search?: string;
  sort?: "recent" | "budget" | "title";
  page?: number;
}) {
  const session = await auth();
  if (!session?.user) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };

  const where: Prisma.ServiceRequestWhereInput = { clientId: session.user.id };
  if (params?.status && params.status !== "ALL") where.status = params.status;
  if (params?.category) where.category = params.category;
  if (params?.search) {
    where.OR = [
      { title: { contains: params.search } },
      { description: { contains: params.search } },
    ];
  }

  let orderBy: Prisma.ServiceRequestOrderByWithRelationInput = { createdAt: "desc" };
  if (params?.sort === "budget") orderBy = { estimatedBudget: "desc" };
  else if (params?.sort === "title") orderBy = { title: "asc" };

  const page = params?.page ?? 1;
  const pageSize = 20;

  const [data, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      include: {
        offers: {
          include: {
            provider: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getMyRequestsStats() {
  const session = await auth();
  if (!session?.user) return { total: 0, open: 0, inProgress: 0, closed: 0 };

  const [total, open, inProgress, closed] = await Promise.all([
    prisma.serviceRequest.count({ where: { clientId: session.user.id } }),
    prisma.serviceRequest.count({ where: { clientId: session.user.id, status: "OPEN" } }),
    prisma.serviceRequest.count({ where: { clientId: session.user.id, status: "IN_PROGRESS" } }),
    prisma.serviceRequest.count({ where: { clientId: session.user.id, status: "CLOSED" } }),
  ]);

  return { total, open, inProgress, closed };
}

export async function updateServiceRequest(formData: FormData) {
  let user;
  try {
    user = await requireRole("CLIENT");
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Non autorisé" };
  }

  const requestId = formData.get("requestId") as string;
  const rawBudget = formData.get("estimatedBudget") as string;

  const validated = updateRequestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    location: formData.get("location"),
    estimatedBudget: rawBudget || undefined,
  });
  if (!validated.success) return { error: validated.error.issues[0].message };
  const { title, description, category, location } = validated.data;

  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request || request.clientId !== user.id) return { error: "Demande introuvable" };
  if (request.status !== "OPEN") return { error: "Vous ne pouvez modifier qu'une demande ouverte" };

  const budgetValue = rawBudget ? parseFloat(rawBudget) : null;

  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: {
      title,
      description,
      category,
      location,
      estimatedBudget: budgetValue && !isNaN(budgetValue) ? budgetValue : null,
    },
  });

  revalidatePath("/dashboard/client");
  return { success: "Demande mise à jour" };
}

export async function deleteServiceRequest(requestId: string) {
  let user;
  try {
    user = await requireRole("CLIENT");
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Non autorisé" };
  }

  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request || request.clientId !== user.id) return { error: "Demande introuvable" };
  if (request.status !== "OPEN") return { error: "Vous ne pouvez supprimer qu'une demande ouverte" };

  await prisma.serviceRequest.delete({ where: { id: requestId } });

  revalidatePath("/dashboard/client");
  return { success: "Demande supprimée" };
}

export async function getRequestById(requestId: string) {
  return prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      client: { select: { name: true, id: true } },
      offers: {
        include: {
          provider: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
    },
  });
}
