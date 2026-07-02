import { useEffect, useState } from 'react';

import { cachedVimeoMeta, fetchVimeoMeta, type VimeoMeta } from '@/lib/sparky';

/**
 * Resolves a Vimeo video's real title + thumbnail from its URL (public oEmbed,
 * on-device). Returns null until it loads / if the URL isn't Vimeo. Used to give
 * snippets and lessons real thumbnails, since the DB has no thumbnail column.
 *
 * Seeds from the session cache synchronously, so a card that already resolved
 * once shows its thumbnail immediately on remount instead of flashing the
 * gradient placeholder while it re-fetches.
 */
export function useVimeoMeta(url: string | null) {
  const [meta, setMeta] = useState<VimeoMeta | null>(() => (url ? cachedVimeoMeta(url) : null));

  useEffect(() => {
    let active = true;
    if (url) {
      const cached = cachedVimeoMeta(url);
      if (cached) setMeta(cached);
      // Only overwrite with a successful fetch — a transient failure returns
      // null and must not blank out a thumbnail we already have.
      fetchVimeoMeta(url).then((m) => active && m && setMeta(m));
    } else {
      setMeta(null);
    }
    return () => {
      active = false;
    };
  }, [url]);

  return meta;
}
