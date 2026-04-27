import { google } from "googleapis";
import { readFile } from "fs/promises";
import path from "path";

function toBase64Url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function encodeMimeWordUtf8(input: string) {
  return `=?UTF-8?B?${Buffer.from(input, "utf8").toString("base64")}?=`;
}

function buildOAuthClientFromEnv() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Hiányzó OAuth konfiguráció az email küldéshez (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN)."
    );
  }

  const oauth2Client = new google.auth.OAuth2({
    clientId,
    clientSecret,
  });

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

function resolveBaseAppUrl(appUrl?: string) {
  const baseAppUrl =
    appUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://tippeljpontosan.vercel.app");

  return baseAppUrl.replace(/\/$/, "");
}

async function getInlineLogoData(baseAppUrl: string) {
  const logoPath = path.join(process.cwd(), "public", "weblogo.png");
  const fallbackLogoUrl = `${baseAppUrl}/weblogo.png`;

  try {
    const logoBuffer = await readFile(logoPath);
    return {
      inlineLogoBase64: logoBuffer.toString("base64"),
      logoTag:
        '<img src="cid:weblogo" alt="Tippeljpontosan logó" style="display:block; width: 170px; max-width: 100%; height: auto;"/>',
    };
  } catch {
    return {
      inlineLogoBase64: null,
      logoTag: `<img src="${fallbackLogoUrl}" alt="Tippeljpontosan logó" style="display:block; width: 170px; max-width: 100%; height: auto;"/>`,
    };
  }
}

async function sendBrandedHtmlEmail(params: {
  to: string;
  subject: string;
  htmlBody: string;
  fromNameEnvKey: string;
  fallbackFromName: string;
  appUrl?: string;
}) {
  const { to, subject, htmlBody, fromNameEnvKey, fallbackFromName, appUrl } = params;
  const auth = buildOAuthClientFromEnv();
  const gmail = google.gmail({ version: "v1", auth });

  const fromLabel = process.env[fromNameEnvKey] || fallbackFromName;
  const fromAddress = process.env.INVITE_EMAIL_FROM_ADDRESS;
  const encodedFromLabel = encodeMimeWordUtf8(fromLabel);
  const fromHeader = fromAddress ? `${encodedFromLabel} <${fromAddress}>` : encodedFromLabel;
  const encodedSubject = encodeMimeWordUtf8(subject);

  const normalizedBaseAppUrl = resolveBaseAppUrl(appUrl);
  const { inlineLogoBase64 } = await getInlineLogoData(normalizedBaseAppUrl);

  const mixedBoundary = `tippeljpontosan_mixed_${Date.now()}`;
  const relatedBoundary = `tippeljpontosan_related_${Date.now()}`;

  const mimeParts: string[] = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary=\"${mixedBoundary}\"`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/related; boundary=\"${relatedBoundary}\"`,
    "",
    `--${relatedBoundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    htmlBody,
    "",
  ];

  if (inlineLogoBase64) {
    mimeParts.push(
      `--${relatedBoundary}`,
      "Content-Type: image/png; name=\"weblogo.png\"",
      "Content-Transfer-Encoding: base64",
      "Content-ID: <weblogo>",
      "Content-Disposition: inline; filename=\"weblogo.png\"",
      "",
      inlineLogoBase64,
      ""
    );
  }

  mimeParts.push(`--${relatedBoundary}--`, "", `--${mixedBoundary}--`);

  const raw = mimeParts.join("\n");
  const encoded = toBase64Url(raw);

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encoded,
    },
  });

  return result.data;
}

export async function sendInviteCodeEmail(params: {
  to: string;
  inviteCode: string;
  appUrl?: string;
}) {
  const { to, inviteCode, appUrl } = params;
  const subject = "Meghívó a Tippelj Pontosan játékhoz";
  const normalizedBaseAppUrl = resolveBaseAppUrl(appUrl);
  const { logoTag } = await getInlineLogoData(normalizedBaseAppUrl);

  const htmlBody = `
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.5; color: #111827;">
  <p>Kedves Meghívott!</p>
  <p>A tippeljpontosan csapata meghívott a játékra.</p>
  <p><strong>A meghívó kódod:</strong><br/>${inviteCode}</p>
  <p>
    Kérjük a megadott a linken regisztrálj.<br/>
    Link: <a href="https://tippeljpontosan.vercel.app/" target="_blank" rel="noopener noreferrer">https://tippeljpontosan.vercel.app/</a>
  </p>
  <p>
    Kérjük, hogy a regisztráció során olyan felhasználó nevet adj meg, ami alapján a csapat be tud azonosítani.
  </p>
  <p>Üdv</p>
  <p><strong>Tippeljpontosan</strong></p>
  <p style="margin-top: 14px;">
    ${logoTag}
  </p>
</div>
`.trim();

  return sendBrandedHtmlEmail({
    to,
    subject,
    htmlBody,
    fromNameEnvKey: "INVITE_EMAIL_FROM_NAME",
    fallbackFromName: "Tippelj Pontosan",
    appUrl,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
  appUrl?: string;
}) {
  const { to, resetUrl, appUrl } = params;
  const subject = "Jelszó visszaállítás - Tippelj Pontosan";
  const normalizedBaseAppUrl = resolveBaseAppUrl(appUrl);
  const { logoTag } = await getInlineLogoData(normalizedBaseAppUrl);

  const htmlBody = `
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.5; color: #111827;">
  <p>Kedves Játékos!</p>
  <p>Jelszó visszaállítási kérelmet kaptunk a fiókodhoz.</p>
  <p>
    Az alábbi linkre kattintva új jelszót állíthatsz be (15 percig érvényes):
  </p>
  <p>
    <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">Jelszó visszaállítása</a>
  </p>
  <p>Ha nem te kérted, ezt az emailt nyugodtan figyelmen kívül hagyhatod.</p>
  <p>Üdv</p>
  <p><strong>Tippeljpontosan</strong></p>
  <p style="margin-top: 14px;">
    ${logoTag}
  </p>
</div>
`.trim();

  return sendBrandedHtmlEmail({
    to,
    subject,
    htmlBody,
    fromNameEnvKey: "RESET_EMAIL_FROM_NAME",
    fallbackFromName: "Tippelj Pontosan",
    appUrl,
  });
}
