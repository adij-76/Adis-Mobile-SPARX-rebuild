/**
 * Sparky AI chat backend.
 *
 * Set EXPO_PUBLIC_SPARKY_WEBHOOK (an n8n webhook URL) at build time and Sparky
 * will POST { message, sessionId, history } to it and render the reply. If it's
 * unset, the UI falls back to local canned responses so the screen always works.
 *
 * The n8n flow holds the AI provider key server-side — the app only knows the
 * webhook URL. For the web build, the webhook must return CORS headers allowing
 * the site origin; native apps are unaffected by CORS.
 */
const WEBHOOK = (process.env.EXPO_PUBLIC_SPARKY_WEBHOOK ?? '').trim();

export const sparkyConfigured = WEBHOOK.length > 0;

export type SparkyTurn = { role: 'user' | 'assistant'; text: string };

export async function askSparky(
  message: string,
  sessionId: string,
  history: SparkyTurn[],
): Promise<string> {
  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId, history }),
  });
  if (!res.ok) throw new Error(`Sparky webhook ${res.status}`);

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data: unknown = await res.json();
    return extractReply(data);
  }
  return (await res.text()).trim();
}

/** n8n flows return varied shapes; accept the common ones. */
function extractReply(data: unknown): string {
  if (typeof data === 'string') return data;
  if (Array.isArray(data) && data.length) return extractReply(data[0]);
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const candidate = d.reply ?? d.output ?? d.text ?? d.message ?? d.answer;
    if (typeof candidate === 'string') return candidate;
  }
  return "I'm here, but I didn't quite catch a reply. Mind trying again?";
}
