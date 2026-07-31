'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { providerProfileSchema } from '@/lib/validations/providerProfile';
import { ActionResult, ok, fail } from '@/lib/action-result';
import { revalidatePath } from 'next/cache';

export async function updateProviderProfile(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'PROVIDER') {
    return fail('Non autorisé');
  }

  const rawImages = formData.getAll('portfolioImages').map(String).filter(Boolean);
  const rawVideos = formData.getAll('portfolioVideos').map(String).filter(Boolean);

  const result = providerProfileSchema.safeParse({
    businessName: formData.get('businessName') as string,
    category: formData.get('category') as string,
    location: formData.get('location') as string,
    description: (formData.get('description') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
    avatarUrl: (formData.get('avatarUrl') as string) || undefined,
    websiteUrl: (formData.get('websiteUrl') as string) || undefined,
    facebookUrl: (formData.get('facebookUrl') as string) || undefined,
    instagramUrl: (formData.get('instagramUrl') as string) || undefined,
    tiktokUrl: (formData.get('tiktokUrl') as string) || undefined,
    linkedinUrl: (formData.get('linkedinUrl') as string) || undefined,
    youtubeUrl: (formData.get('youtubeUrl') as string) || undefined,
    portfolioImages: rawImages.length > 0 ? rawImages : undefined,
    portfolioVideos: rawVideos.length > 0 ? rawVideos : undefined,
  });

  if (!result.success) {
    return fail(result.error.issues[0]?.message || 'Données invalides');
  }

  const data = result.data;

  try {
    await prisma.providerProfile.update({
      where: { userId: session.user.id },
      data: {
        businessName: data.businessName,
        category: data.category,
        location: data.location,
        description: data.description,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        websiteUrl: data.websiteUrl,
        facebookUrl: data.facebookUrl,
        instagramUrl: data.instagramUrl,
        tiktokUrl: data.tiktokUrl,
        linkedinUrl: data.linkedinUrl,
        youtubeUrl: data.youtubeUrl,
        portfolioImages: data.portfolioImages ? JSON.stringify(data.portfolioImages) : null,
        portfolioVideos: data.portfolioVideos ? JSON.stringify(data.portfolioVideos) : null,
      },
    });

    revalidatePath('/dashboard/prestataire');
    return ok(undefined);
  } catch (err) {
    console.error('Erreur mise à jour profil:', err);
    return fail('Erreur lors de la mise à jour du profil. Veuillez réessayer.');
  }
}

interface SearchParams {
  search?: string;
  category?: string;
  location?: string;
  page?: number;
  limit?: number;
}

export async function searchProviders(params: SearchParams = {}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 9);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.category) {
    where.category = params.category;
  }

  if (params.location) {
    where.location = params.location;
  }

  if (params.search) {
    where.OR = [
      { businessName: { contains: params.search } },
      { description: { contains: params.search } },
      { category: { contains: params.search } },
      { location: { contains: params.search } },
    ];
  }

  const [total, profiles] = await Promise.all([
    prisma.providerProfile.count({ where }),
    prisma.providerProfile.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { name: true, createdAt: true } },
        reviews: { select: { rating: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const formattedData = profiles.map((p) => {
    const ratings = p.reviews.map((r) => r.rating);
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return {
      id: p.id,
      userId: p.userId,
      businessName: p.businessName,
      category: p.category,
      location: p.location,
      description: p.description,
      phone: p.phone,
      plan: p.plan,
      avatarUrl: p.avatarUrl,
      websiteUrl: p.websiteUrl,
      facebookUrl: p.facebookUrl,
      instagramUrl: p.instagramUrl,
      tiktokUrl: p.tiktokUrl,
      linkedinUrl: p.linkedinUrl,
      youtubeUrl: p.youtubeUrl,
      portfolioImages: p.portfolioImages,
      portfolioVideos: p.portfolioVideos,
      averageRating,
      reviewsCount: ratings.length,
      user: p.user,
    };
  });

  return {
    data: formattedData,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}