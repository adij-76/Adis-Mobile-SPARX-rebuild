/**
 * Community posts (comm_posts.content) are rich HTML from the Rails editor —
 * `<p>`, `<h1>`, `<strong>`, `<a href>`, `<span style>`, entities, etc. These
 * helpers render that safely: `sanitizeHtml` for the web (keeps formatting,
 * strips anything dangerous), `htmlToText` for native and previews.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ',
  hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', ldquo: '“',
  rdquo: '”', copy: '©', reg: '®', trade: '™', deg: '°',
};

/** HTML → clean readable plain text (block tags → newlines, tags stripped,
 *  entities decoded). Used on native and for clamped previews. */
export function htmlToText(html: string): string {
  if (!html) return '';
  const text = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|h[1-6]|li|ul|ol|blockquote)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z0-9#]+);/gi, (m, e) => NAMED_ENTITIES[e.toLowerCase()] ?? m);
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Tags kept as-is (formatting). Anything else is unwrapped (content preserved).
const KEEP = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'A', 'SPAN', 'BLOCKQUOTE', 'DIV',
]);
// Tags removed entirely (content dropped) — the XSS/formatting-hazard set.
const DROP = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM',
  'INPUT', 'BUTTON', 'TEXTAREA', 'SVG', 'IMG', 'VIDEO', 'AUDIO', 'BASE',
]);

/**
 * Sanitize HTML for rendering on web: whitelist safe tags, strip ALL attributes
 * except an http(s) `href` on links (so no inline handlers, styles, or
 * javascript: URLs survive). DOM-based (not regex), so it can't be fooled by
 * malformed markup. Falls back to plain text where there's no DOM.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined' || typeof document === 'undefined') return htmlToText(html);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const clean = (parent: Node) => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === 3 /* text */) continue;
      if (node.nodeType !== 1 /* element */) {
        node.parentNode?.removeChild(node);
        continue;
      }
      const el = node as Element;
      const tag = el.tagName.toUpperCase();
      if (DROP.has(tag)) {
        el.remove();
        continue;
      }
      clean(el); // recurse first so unwrapping keeps cleaned children
      if (!KEEP.has(tag)) {
        el.replaceWith(...Array.from(el.childNodes));
        continue;
      }
      for (const attr of Array.from(el.attributes)) {
        const safeHref =
          tag === 'A' && attr.name.toLowerCase() === 'href' && /^https?:\/\//i.test(attr.value.trim());
        if (!safeHref) el.removeAttribute(attr.name);
      }
      if (tag === 'A') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    }
  };
  clean(doc.body);
  return doc.body.innerHTML;
}
