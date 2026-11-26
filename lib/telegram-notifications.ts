type TelegramResult = "sent" | "failed" | "not_configured";

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  return token && chatId ? { token, chatId } : null;
}

/**
 * Sends an operational notification. Notification failure must never roll back
 * a successful database write or expose Telegram credentials to the caller.
 */
export async function sendTelegramNotification(text: string): Promise<TelegramResult> {
  const config = getTelegramConfig();
  if (!config) {
    console.warn("[telegram] Notification skipped: Telegram environment is not configured.");
    return "not_configured";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null) as {
      ok?: boolean;
      description?: string;
    } | null;

    if (!response.ok || result?.ok !== true) {
      console.error("[telegram] Notification delivery failed", {
        status: response.status,
        description: result?.description?.slice(0, 240),
      });
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("[telegram] Notification request failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message.slice(0, 160) : "Unknown error",
    });
    return "failed";
  } finally {
    clearTimeout(timeout);
  }
}
