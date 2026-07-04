import Player from '@vimeo/player';

/**
 * Web implementation: drive an existing Vimeo <iframe> with the official
 * @vimeo/player SDK. Fires `onEnded` once at the end (or ≥95% watched), and
 * `onProgress` as each 25/50/75% milestone is first crossed. Returns a cleanup
 * function. (Metro resolves this file for web; native uses vimeo-attach.ts.)
 */
export type VimeoHandlers = { onEnded: () => void; onProgress: (percent: number) => void };

export function attachVimeo(iframe: HTMLIFrameElement, handlers: VimeoHandlers): () => void {
  let done = false;
  let milestone = 0; // highest 25/50/75 milestone already reported
  const player = new Player(iframe);

  const fire = () => {
    if (done) return;
    done = true;
    handlers.onEnded();
  };
  const onTime = (d: { percent?: number }) => {
    if (done) return;
    const p = d?.percent ?? 0;
    if (p >= 0.95) return fire();
    const next = p >= 0.75 ? 75 : p >= 0.5 ? 50 : p >= 0.25 ? 25 : 0;
    if (next > milestone) {
      milestone = next;
      handlers.onProgress(next);
    }
  };

  player.on('ended', fire);
  player.on('timeupdate', onTime);

  return () => {
    try {
      player.off('ended', fire);
      player.off('timeupdate', onTime);
    } catch {
      /* ignore */
    }
  };
}
