import nodemailer from "nodemailer";

const FROM_NAME = "LocalServices";
const FROM_EMAIL = process.env.SMTP_FROM || "noreply@localservices.fr";

function getTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

function buildEmail(to: string, subject: string, html: string) {
  return { from: `"${FROM_NAME}" <${FROM_EMAIL}>`, to, subject, html };
}

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f3f4f6; padding: 24px;">
  <table style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <tr><td style="background: #2563eb; padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 20px;">LocalServices</h1>
    </td></tr>
    <tr><td style="padding: 32px 24px;">
      ${content}
    </td></tr>
    <tr><td style="background: #f9fafb; padding: 16px 24px; text-align: center; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">LocalServices — Marketplace de services locaux</p>
      <p style="margin: 4px 0;">Cet email est automatique, merci de ne pas y r\u00e9pondre.</p>
    </td></tr>
  </table>
</body>
</html>`;

function textBlock(title: string, body: string, cta?: { label: string; url: string }) {
  return `
    <h2 style="color: #111827; font-size: 18px; margin: 0 0 12px;">${title}</h2>
    <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">${body}</p>
    ${cta ? `<a href="${cta.url}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px;">${cta.label}</a>` : ""}
  `;
}

const templates = {
  welcome(to: string, name: string) {
    return buildEmail(to, "Bienvenue sur LocalServices", baseTemplate(textBlock(
      "Bienvenue !",
      `Bonjour <strong>${name}</strong>,<br><br>Votre compte LocalServices a bien \u00e9t\u00e9 cr\u00e9\u00e9. Vous pouvez d\u00e8s maintenant publier des demandes ou parcourir les prestataires.`,
      { label: "Acc\u00e9der au tableau de bord", url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/connexion` }
    )));
  },

  newOffer(to: string, clientName: string, providerName: string, requestTitle: string) {
    return buildEmail(to, "Nouvelle offre re\u00e7ue", baseTemplate(textBlock(
      "Nouvelle offre !",
      `Bonjour <strong>${clientName}</strong>,<br><br><strong>${providerName}</strong> a envoy\u00e9 une offre pour votre demande "<em>${requestTitle}</em>".<br><br>Connectez-vous pour la consulter et l'accepter ou la refuser.`,
      { label: "Voir l'offre", url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/dashboard/client` }
    )));
  },

  offerAccepted(to: string, providerName: string, requestTitle: string) {
    return buildEmail(to, "Offre accept\u00e9e", baseTemplate(textBlock(
      "Offre accept\u00e9e !",
      `Bonjour <strong>${providerName}</strong>,<br><br>F\u00e9licitations ! Votre offre pour "<em>${requestTitle}</em>" a \u00e9t\u00e9 accept\u00e9e par le client.`,
      { label: "Voir les d\u00e9tails", url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/dashboard/prestataire` }
    )));
  },

  offerRejected(to: string, providerName: string, requestTitle: string) {
    return buildEmail(to, "Offre refus\u00e9e", baseTemplate(textBlock(
      "Offre refus\u00e9e",
      `Bonjour <strong>${providerName}</strong>,<br><br>Votre offre pour "<em>${requestTitle}</em>" n'a pas \u00e9t\u00e9 retenue. Ne vous d\u00e9couragez pas, d'autres demandes vous attendent.`,
      { label: "Voir les demandes", url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/dashboard/prestataire` }
    )));
  },

  newMessage(to: string, recipientName: string, senderName: string) {
    return buildEmail(to, "Nouveau message", baseTemplate(textBlock(
      "Nouveau message",
      `Bonjour <strong>${recipientName}</strong>,<br><br><strong>${senderName}</strong> vous a envoy\u00e9 un message.`,
      { label: "R\u00e9pondre", url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/dashboard` }
    )));
  },

  reviewReceived(to: string, providerName: string, rating: number) {
    return buildEmail(to, "Nouvel avis re\u00e7u", baseTemplate(textBlock(
      "Nouvel avis client",
      `Bonjour <strong>${providerName}</strong>,<br><br>Un client vous a not\u00e9 <strong>${rating}/5</strong>. Consultez votre profil pour voir le commentaire.`,
      { label: "Voir mon profil", url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/dashboard/prestataire` }
    )));
  },

  offerCompleted(to: string, clientName: string, providerName: string, requestTitle: string) {
    return buildEmail(to, "Travaux termin\u00e9s", baseTemplate(textBlock(
      "Travaux termin\u00e9s",
      `Bonjour <strong>${clientName}</strong>,<br><br><strong>${providerName}</strong> a marqu\u00e9 les travaux comme termin\u00e9s pour "<em>${requestTitle}</em>".<br><br>N'oubliez pas de laisser un avis !`,
      { label: "Laisser un avis", url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/dashboard/client` }
    )));
  },
};

export async function sendEmail(to: string, subject: string, html: string) {
  if (process.env.NODE_ENV === "development" && !process.env.SMTP_HOST) {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }

  const transport = getTransport();
  if (!transport) {
    console.warn("[EMAIL] Aucun serveur SMTP configur\u00e9. D\u00e9finissez SMTP_HOST dans .env");
    return;
  }

  try {
    await transport.sendMail({ from: `"${FROM_NAME}" <${FROM_EMAIL}>`, to, subject, html });
  } catch (err) {
    console.error("[EMAIL] Erreur d'envoi:", err);
  }
}

export async function sendTemplate<T extends keyof typeof templates>(
  type: T,
  ...args: Parameters<(typeof templates)[T]>
) {
  const fn = templates[type] as (...args: Parameters<(typeof templates)[T]>) => ReturnType<(typeof templates)[T]>;
  const email = fn(...args);
  await sendEmail(email.to, email.subject, email.html);
}
