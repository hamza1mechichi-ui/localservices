"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { sendTemplate } from "@/lib/email";

export async function sendMessage(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const conversationId = formData.get("conversationId") as string;
  const content = formData.get("content") as string;

  if (!conversationId || !content || content.trim().length === 0) {
    return { error: "Message vide" };
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) return { error: "Conversation introuvable" };

  const isParticipant =
    conversation.clientId === session.user.id ||
    (await prisma.providerProfile.findFirst({
      where: { id: conversation.providerId, userId: session.user.id },
    })) !== null;

  if (!isParticipant) return { error: "Non autorisé" };

  await prisma.message.create({
    data: {
      conversationId,
      senderId: session.user.id,
      content: content.trim(),
    },
  });

  const otherUserId =
    conversation.clientId === session.user.id
      ? (await prisma.providerProfile.findUnique({ where: { id: conversation.providerId } }))?.userId
      : conversation.clientId;

  if (otherUserId) {
    const otherRole = conversation.clientId === otherUserId ? "client" : "prestataire";
    await prisma.notification.create({
      data: {
        userId: otherUserId,
        type: "NEW_MESSAGE",
        message: `Nouveau message de ${session.user.name}`,
        link: `/dashboard/${otherRole}`,
      },
    });

    const otherUser = await prisma.user.findUnique({ where: { id: otherUserId } });
    if (otherUser?.email) {
      sendTemplate("newMessage", otherUser.email, otherUser.name, session.user.name ?? "Un utilisateur");
    }
  }

  revalidatePath(`/dashboard/messages/${conversationId}`);
  return { success: true };
}

export async function getOrCreateConversation(otherId: string, requestId?: string) {
  const session = await auth();
  if (!session?.user) return null;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
  });

  const isProvider = !!profile;

  if (isProvider) {
    const existing = await prisma.conversation.findUnique({
      where: {
        clientId_providerId_requestId: {
          clientId: otherId,
          providerId: profile.id,
          requestId: requestId ?? "",
        },
      },
    });
    if (existing) return existing;

    return prisma.conversation.create({
      data: {
        clientId: otherId,
        providerId: profile.id,
        requestId: requestId ?? null,
      },
    });
  }

  const existing = await prisma.conversation.findUnique({
    where: {
      clientId_providerId_requestId: {
        clientId: session.user.id,
        providerId: otherId,
        requestId: requestId ?? "",
      },
    },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      clientId: session.user.id,
      providerId: otherId,
      requestId: requestId ?? null,
    },
  });
}

export async function startConversationAsProvider(clientId: string, requestId?: string) {
  const session = await auth();
  if (!session?.user) return null;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return null;

  const existing = await prisma.conversation.findUnique({
    where: {
      clientId_providerId_requestId: {
        clientId,
        providerId: profile.id,
        requestId: requestId ?? "",
      },
    },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      clientId,
      providerId: profile.id,
      requestId: requestId ?? null,
    },
  });
}

export async function getMyConversations() {
  const session = await auth();
  if (!session?.user) return [];

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (profile) {
    return prisma.conversation.findMany({
      where: { providerId: profile.id },
      include: {
        client: { select: { id: true, name: true } },
        request: { select: { id: true, title: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: { where: { read: false, senderId: { not: session.user.id } } } } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  return prisma.conversation.findMany({
    where: { clientId: session.user.id },
    include: {
      provider: { select: { id: true, businessName: true, user: { select: { name: true } } } },
      request: { select: { id: true, title: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: { where: { read: false, senderId: { not: session.user.id } } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getConversationMessages(conversationId: string) {
  const session = await auth();
  if (!session?.user) return null;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) return null;

  const isClient = conversation.clientId === session.user.id;
  const isProvider = !!(await prisma.providerProfile.findFirst({
    where: { id: conversation.providerId, userId: session.user.id },
  }));
  if (!isClient && !isProvider) return null;

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: session.user.id }, read: false },
    data: { read: true },
  });

  const enriched = {
    ...conversation,
    messages: messages.map((m) => ({
      ...m,
      isMine: m.senderId === session.user.id,
    })),
  };

  if (isClient) {
    const provider = await prisma.providerProfile.findUnique({
      where: { id: conversation.providerId },
      select: { businessName: true, user: { select: { name: true } } },
    });
    return { ...enriched, otherName: provider?.businessName || provider?.user.name };
  }

  const client = await prisma.user.findUnique({
    where: { id: conversation.clientId },
    select: { name: true },
  });
  return { ...enriched, otherName: client?.name };
}
