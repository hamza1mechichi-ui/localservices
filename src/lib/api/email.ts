import { sendEmail } from "@/lib/email";

/**
 * Envoie un OTP par email.
 */
export async function sendEmailOTP(target: string, otp: string): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f3f4f6; padding: 24px;">
  <table style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <tr><td style="background: #2563eb; padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 20px;">LocalServices</h1>
    </td></tr>
    <tr><td style="padding: 32px 24px;">
      <h2 style="color: #111827; font-size: 18px; margin: 0 0 12px;">Code de vérification</h2>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
        Votre code de vérification est :
      </p>
      <div style="text-align: center; font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 6px; margin: 16px 0;">
        ${otp}
      </div>
      <p style="color: #6b7280; font-size: 13px; margin: 0;">
        Ce code expire dans 10 minutes. Ne le partagez avec personne.
      </p>
    </td></tr>
    <tr><td style="background: #f9fafb; padding: 16px 24px; text-align: center; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">LocalServices — Marketplace de services locaux</p>
      <p style="margin: 4px 0;">Cet email est automatique, merci de ne pas y répondre.</p>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmail(target, "Votre code de vérification LocalServices", html);
}

