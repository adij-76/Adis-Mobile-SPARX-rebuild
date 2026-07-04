/**
 * Attach completion tracking to a Vimeo iframe.
 *
 * This is the base (native / default) implementation — a no-op, because on native
 * the video opens in the system browser, which we can't observe. Metro resolves
 * `vimeo-attach.web.ts` for the web build, which drives the official @vimeo/player
 * SDK, so the SDK never enters the native bundle. TypeScript resolves this base
 * file; keep the two signatures identical.
 */
export type VimeoHandlers = { onEnded: () => void; onProgress: (percent: number) => void };

export function attachVimeo(_iframe: unknown, _handlers: VimeoHandlers): () => void {
  return () => {};
}
