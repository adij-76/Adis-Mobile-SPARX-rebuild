import { useEffect, useState } from 'react';

import { fetchVimeoMeta } from '@/lib/sparky';

/**
 * Resolves a Vimeo video's real title + thumbnail from its URL (public oEmbed,
 * on-device). Returns null until it loads / if the URL isn't Vimeo. Used to give
 * snippets and lessons real thumbnails, since the DB has no thumbnail column.
 */
export function useVimeoMeta(url: string | null) {
  const [meta, setMeta] = useState<{ title?: string; thumbnail?: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (url) fetchVimeoMeta(url).then((m) => active && setMeta(m));
    else setMeta(null);
    return () => {
      active = false;
    };
  }, [url]);

  return meta;
}
