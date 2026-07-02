/**
 * Sparky AI chat backend.
 *
 * Set EXPO_PUBLIC_SPARKY_WEBHOOK (an n8n webhook URL) at build time and Sparky
 * will POST to it and render the reply. If it's unset, the UI falls back to
 * local canned responses so the screen always works.
 *
 * The n8n flow holds the AI provider key server-side — the app only knows the
 * webhook URL. For the web build, the webhook must return CORS headers allowing
 * the site origin; native apps are unaffected by CORS.
 *
 * Replies can carry videos: the flow may return a structured `videos` array, or
 * just drop Vimeo links into the message text. Either way we surface them as
 * playable cards (see extractReply / vimeoEmbedUrl).
 */
// The n8n webhook is provided at build time (repo variable → EXPO_PUBLIC_SPARKY_WEBHOOK).
// Fail closed: if it's not set, Sparky uses local canned responses rather than
// shipping a live production webhook URL baked into the client bundle.
const WEBHOOK = (process.env.EXPO_PUBLIC_SPARKY_WEBHOOK || '').trim();

export const sparkyConfigured = WEBHOOK.length > 0;

export type SparkyTurn = { role: 'user' | 'assistant'; text: string };

export type SparkyVideo = { url: string; title?: string; thumbnail?: string };

/** A Sparky reply: the text bubble plus any videos to render as cards. */
export type SparkyReply = { text: string; videos: SparkyVideo[] };

export async function askSparky(
  message: string,
  sessionId: string,
  history: SparkyTurn[],
  userId: string | null,
): Promise<SparkyReply> {
  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // n8n's Chat Trigger node expects `chatInput` + `sessionId` (and an
    // `action`). We also send `message`/`history` so a plain Webhook node
    // still works — harmless extra fields either way. `userId`/`timestamp`
    // drive the flow's personalization + crisis-alert nodes. userId is the
    // signed-in user's production id (mobile_me.app_user_id), never a constant.
    body: JSON.stringify({
      action: 'sendMessage',
      chatInput: message,
      sessionId,
      userId: userId ?? '',
      timestamp: new Date().toISOString(),
      message,
      history,
    }),
  });
  if (!res.ok) throw new Error(`Sparky webhook ${res.status}`);

  const contentType = res.headers.get('content-type') ?? '';
  const data: unknown = contentType.includes('application/json')
    ? await res.json()
    : (await res.text()).trim();
  const reply = extractReply(data);
  // The model sometimes invents Vimeo links — verify each one really exists
  // before we show a card, so we never render a broken/non-existent video.
  const videos = await validateVideos(reply.videos);
  return { text: reply.text, videos };
}

const FALLBACK_TEXT = "I'm here, but I didn't quite catch a reply. Mind trying again?";
const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

/** Pull the reply text + any videos out of whatever shape n8n returned. */
function extractReply(data: unknown): SparkyReply {
  const raw = findText(data) ?? FALLBACK_TEXT;
  const { text, videos: linkVideos } = stripVideoLinks(raw);
  const videos = dedupeVideos([
    ...collectStructuredVideos(data),
    ...linkVideos,
    ...scanVimeoLinks(text),
  ]);
  return { text: tidy(text), videos };
}

/** n8n flows return varied shapes; find the first reply-like string. */
function findText(data: unknown): string | null {
  if (typeof data === 'string') return data.trim() || null;
  if (Array.isArray(data)) {
    for (const x of data) {
      const r = findText(x);
      if (r) return r;
    }
    return null;
  }
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    // The n8n AI Agent nests its answer under output: { message: ... }.
    if (d.output && typeof d.output === 'object') {
      const r = findText(d.output);
      if (r) return r;
    }
    for (const k of ['reply', 'output', 'text', 'message', 'answer'] as const) {
      const v = d[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return null;
}

/** Collect a structured `videos` array (top-level or under output). */
function collectStructuredVideos(data: unknown): SparkyVideo[] {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) return data.flatMap(collectStructuredVideos);
  const d = data as Record<string, unknown>;
  const out: SparkyVideo[] = [];
  if (Array.isArray(d.videos)) {
    for (const v of d.videos) {
      if (typeof v === 'string') {
        out.push({ url: v });
      } else if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        const url = o.url ?? o.link ?? o.embed_url ?? o.vimeo_url;
        if (typeof url === 'string') {
          out.push({
            url,
            title: typeof o.title === 'string' ? o.title : undefined,
            thumbnail: typeof o.thumbnail === 'string' ? o.thumbnail : undefined,
          });
        }
      }
    }
  }
  if (d.output && typeof d.output === 'object') out.push(...collectStructuredVideos(d.output));
  return out;
}

/** Turn `[label](vimeo-url)` markdown into videos and drop it from the text. */
function stripVideoLinks(text: string): { text: string; videos: SparkyVideo[] } {
  const videos: SparkyVideo[] = [];
  const stripped = text.replace(MD_LINK, (_whole, label: string, url: string) => {
    if (vimeoId(url)) {
      videos.push({ url, title: label.trim() });
      return ''; // the card replaces the inline link
    }
    return label; // keep non-video links as plain label text
  });
  return { text: stripped, videos };
}

/** Fallback: bare Vimeo URLs still sitting in the text. */
function scanVimeoLinks(text: string): SparkyVideo[] {
  const re = /https?:\/\/(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?\d+(?:\/\w+)?/gi;
  return (text.match(re) ?? []).map((url) => ({ url }));
}

function dedupeVideos(videos: SparkyVideo[]): SparkyVideo[] {
  const seen = new Set<string>();
  const out: SparkyVideo[] = [];
  for (const v of videos) {
    const key = vimeoId(v.url) ?? v.url;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

/** Light markdown cleanup so bold/links don't show raw markup. */
function tidy(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/:\s*\./g, '.')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Numeric Vimeo id from common URL shapes (vimeo.com/ID, player.vimeo.com/video/ID). */
export function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return m ? m[1] : null;
}

/** Embeddable player URL, preserving unlisted hash tokens (/hash or ?h=). */
export function vimeoEmbedUrl(url: string): string | null {
  const id = vimeoId(url);
  if (!id) return null;
  const hash =
    url.match(/vimeo\.com\/(?:video\/)?\d+\/(\w+)/i)?.[1] ?? url.match(/[?&]h=(\w+)/i)?.[1] ?? null;
  const base = `https://player.vimeo.com/video/${id}`;
  return hash ? `${base}?h=${hash}` : base;
}

/**
 * Fetch a Vimeo video's real title + thumbnail from the public (CORS-enabled)
 * oEmbed endpoint. Returns null if it's not a Vimeo URL, the video doesn't
 * exist, or Vimeo can't be reached — callers fall back to whatever they have.
 */
// Session cache of resolved oEmbed metadata, keyed by watch URL. Vimeo's oEmbed
// endpoint rate-limits, so without this a rail of videos re-fetches on every
// mount and a few requests intermittently 429 → gradient placeholder. Once a
// video resolves we keep it for the session so it never flickers back.
export type VimeoMeta = { title?: string; thumbnail?: string };
const vimeoMetaCache = new Map<string, VimeoMeta>();
// Share one in-flight request across all cards pointing at the same URL.
const vimeoMetaInflight = new Map<string, Promise<VimeoMeta | null>>();

/** Synchronous cache peek, so a remounting card shows its thumbnail with no flash. */
export function cachedVimeoMeta(url: string): VimeoMeta | null {
  const watch = vimeoWatchUrl(url);
  return watch ? vimeoMetaCache.get(watch) ?? null : null;
}

async function fetchVimeoOnce(watch: string): Promise<VimeoMeta> {
  const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(watch)}`);
  if (!res.ok) throw new Error(`oembed ${res.status}`);
  const data = (await res.json()) as { title?: string; thumbnail_url?: string };
  return { title: data.title, thumbnail: data.thumbnail_url };
}

export async function fetchVimeoMeta(url: string): Promise<VimeoMeta | null> {
  const watch = vimeoWatchUrl(url);
  if (!watch) return null;
  const cached = vimeoMetaCache.get(watch);
  if (cached) return cached;
  const pending = vimeoMetaInflight.get(watch);
  if (pending) return pending;

  const run = (async (): Promise<VimeoMeta | null> => {
    // One retry with a short backoff smooths over transient 429s / blips.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const meta = await fetchVimeoOnce(watch);
        if (meta.thumbnail || meta.title) vimeoMetaCache.set(watch, meta);
        return meta;
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
      }
    }
    return null; // leave uncached so a later mount can retry
  })();
  vimeoMetaInflight.set(watch, run);
  try {
    return await run;
  } finally {
    vimeoMetaInflight.delete(watch);
  }
}

/** Canonical watch URL (vimeo.com/ID[?h=hash]) used for oEmbed lookups. */
function vimeoWatchUrl(url: string): string | null {
  const id = vimeoId(url);
  if (!id) return null;
  const hash =
    url.match(/vimeo\.com\/(?:video\/)?\d+\/(\w+)/i)?.[1] ?? url.match(/[?&]h=(\w+)/i)?.[1] ?? null;
  return hash ? `https://vimeo.com/${id}?h=${hash}` : `https://vimeo.com/${id}`;
}

/**
 * Drop videos the model invented. Vimeo's (CORS-enabled, public) oEmbed endpoint
 * returns 404 for non-existent videos and 4xx for ones that can't be embedded —
 * in those cases we hide the card instead of showing a broken player. Valid
 * videos are enriched with the real title + thumbnail. A network failure keeps
 * the video unvalidated (benefit of the doubt) rather than dropping everything.
 */
async function validateVideos(videos: SparkyVideo[]): Promise<SparkyVideo[]> {
  const results = await Promise.all(
    videos.map(async (v): Promise<SparkyVideo | null> => {
      const watch = vimeoWatchUrl(v.url);
      if (!watch) return null; // not a Vimeo link → can't play → drop
      try {
        const res = await fetch(
          `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(watch)}`,
        );
        if (!res.ok) return res.status >= 500 ? v : null; // 4xx → non-existent/blocked → drop
        const data = (await res.json()) as { title?: string; thumbnail_url?: string };
        return {
          url: v.url,
          title: v.title ?? data.title,
          thumbnail: v.thumbnail ?? data.thumbnail_url,
        };
      } catch {
        return v; // couldn't reach Vimeo (rare) → keep as-is
      }
    }),
  );
  return results.filter((x): x is SparkyVideo => x !== null);
}
