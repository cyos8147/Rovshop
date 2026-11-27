import "server-only";

// Admin notifications to Telegram and/or Discord (both free). Each channel
// is enabled only when its environment variables are set:
//   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID   (bot from @BotFather)
//   DISCORD_WEBHOOK_URL                      (channel → Integrations → Webhooks)
// Failures are swallowed: a notification must never break a payment.

const TIMEOUT_MS = 5000;

// Customers' emails go to a third-party chat service, so only a masked form
// is sent — enough for the admin to recognise who it is.
export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${"*".repeat(Math.max(1, user.length - visible.length))}@${domain}`;
}

function adminUrl(path: string) {
  const base = process.env.NEXTAUTH_URL?.replace(/\/+$/, "");
  return base ? `${base}${path}` : null;
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function sendDiscord(text: string) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // allowed_mentions: none — text containing "@everyone" can't ping.
    body: JSON.stringify({ content: text.slice(0, 1900), allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export async function notifyAdmins(lines: string[], linkPath?: string) {
  const link = linkPath ? adminUrl(linkPath) : null;
  const text = [...lines, ...(link ? [link] : [])].join("\n");
  await Promise.allSettled([sendTelegram(text), sendDiscord(text)]);
}
