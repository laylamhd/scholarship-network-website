import "server-only";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

/**
 * Outgoing e-mail through Amazon SES (Simple Email Service).
 *
 *   MAIL_FROM   the verified sender, e.g. "TBHF Scholars <no-reply@tbhf.example.org>"
 *
 * Without MAIL_FROM (local development, or the Academy sandbox where SES is
 * unavailable) messages are written to the server log instead of being sent.
 * Note: a new SES account starts in "sandbox mode" and only delivers to
 * addresses you have verified in SES, until AWS grants production access.
 */
let ses: SESv2Client | null = null;

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  const from = process.env.MAIL_FROM;
  if (!from) {
    console.warn(`[mail] MAIL_FROM not set — not sending "${subject}" to ${to}`);
    return false;
  }
  ses ??= new SESv2Client({ region: process.env.SES_REGION ?? process.env.AWS_REGION ?? "us-east-1" });
  try {
    await ses.send(new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Text: { Data: text, Charset: "UTF-8" }, ...(html ? { Html: { Data: html, Charset: "UTF-8" } } : {}) },
        },
      },
    }));
    return true;
  } catch (e) {
    // Never reveal delivery problems to the visitor (e.g. SES sandbox refusing an
    // unverified recipient) — log them for the operator instead.
    console.error("[mail] SES send failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
