import "server-only";

// WhatsApp Cloud API: template messages from the shop's business number.
// Business-started messages must use a template approved in WhatsApp
// Manager; its {{1}}, {{2}}… placeholders are filled in order.

const GRAPH = "https://graph.facebook.com/v21.0";

export type WhatsAppConfig = { phoneNumberId: string; token: string };

/** The Cloud API settings, or null until both are set. */
export function whatsappConfig(): WhatsAppConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  return phoneNumberId && token ? { phoneNumberId, token } : null;
}

export type SendResult = { ok: true; messageId: string } | { ok: false; error: string };

export async function sendTemplate(
  config: WhatsAppConfig,
  message: { to: string; template: string; language: string; params: string[] },
): Promise<SendResult> {
  try {
    const response = await fetch(`${GRAPH}/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: message.to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: message.template,
          language: { code: message.language },
          components: [
            {
              type: "body",
              // Template variables can't hold new lines or tabs.
              parameters: message.params.map((text) => ({
                type: "text",
                text: text.replace(/\s+/g, " ").trim().slice(0, 1000) || "-",
              })),
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string; code?: number };
    };
    if (!response.ok || !body.messages?.[0]?.id) {
      const reason = body.error?.message ?? `HTTP ${response.status}`;
      return {
        ok: false,
        error: `${reason}${body.error?.code ? ` (code ${body.error.code})` : ""}`,
      };
    }
    return { ok: true, messageId: body.messages[0].id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Request failed" };
  }
}
