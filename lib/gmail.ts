import { google } from "googleapis";

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

export async function sendInviteCodeEmail(params: {
  to: string;
  inviteCode: string;
  appUrl?: string;
}) {
  const { to, inviteCode } = params;
  const auth = buildOAuthClientFromEnv();
  const gmail = google.gmail({ version: "v1", auth });

  const fromLabel = process.env.INVITE_EMAIL_FROM_NAME || "Tippelj Pontosan";
  const fromAddress = process.env.INVITE_EMAIL_FROM_ADDRESS;
  const encodedFromLabel = encodeMimeWordUtf8(fromLabel);
  const fromHeader = fromAddress ? `${encodedFromLabel} <${fromAddress}>` : encodedFromLabel;
  const subject = "Meghívó a Tippelj Pontosan játékhoz";
  const encodedSubject = encodeMimeWordUtf8(subject);

  const textLines = [
    "Kedves Meghívott!",
    "",
    "A tippeljpontosan csapata meghívott a játékra.",
    "A meghívó kódod:",
    inviteCode,
    "Kérjük a megadott a linken regisztrálj.",
    "Link:https://tippeljpontosan.vercel.app/",
    "Kérjük, hogy a regisztráció során olyan felhasználó nevet adj meg, ami alapján a csapat be tud azonosítani.",
    "",
    "Üdv",
    "",
    "Tippeljpontosan",
  ];

  const raw = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    textLines.join("\n"),
  ].join("\n");

  const encoded = toBase64Url(raw);

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encoded,
    },
  });

  return result.data;
}
