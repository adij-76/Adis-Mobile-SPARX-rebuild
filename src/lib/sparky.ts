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
// Production n8n webhook (overridable at build time via the repo variable).
const DEFAULT_WEBHOOK = 'https://igntd.app.n8n.cloud/webhook/380bcfd0-caf8-4333-b9e7-783f363daf01';
const WEBHOOK = (process.env.EXPO_PUBLIC_SPARKY_WEBHOOK || DEFAULT_WEBHOOK).trim();

// The n8n flow personalizes on userId (coach, check-ins, Wheel of Life). Until
// real auth is wired up, default to the team's test user (11). Override per
// build with EXPO_PUBLIC_SPARKY_USER_ID.
const USER_ID = (process.env.EXPO_PUBLIC_SPARKY_USER_ID || '11').trim();

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
    // n8n's Chat Trigger node expects `chatInput` + `sessionId` (and an
    // `action`). We also send `message`/`history` so a plain Webhook node
    // still works — harmless extra fields either way. `userId`/`timestamp`
    // drive the flow's personalization + crisis-alert nodes.
    body: JSON.stringify({
      action: 'sendMessage',
      chatInput: message,
      sessionId,
      userId: USER_ID,
      timestamp: new Date().toISOString(),
      message,
      history,
    }),
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
