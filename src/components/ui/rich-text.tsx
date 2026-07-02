import { createElement } from 'react';
import { Platform } from 'react-native';

import { Txt } from '@/components/ui/text';
import { htmlToText, sanitizeHtml } from '@/lib/html';

// Scoped styles for the rendered HTML so it reads in the app's type/colour and
// prod inline styling (giant headers, grey spans) is normalised. Injected once.
const RICH_CSS = `
.sparx-rich { font-family: Lato_400Regular, system-ui, sans-serif; font-size: 14px; line-height: 20px; color: #1A2B3B; word-break: break-word; }
.sparx-rich p { margin: 0 0 8px; }
.sparx-rich p:last-child { margin-bottom: 0; }
.sparx-rich h1, .sparx-rich h2, .sparx-rich h3, .sparx-rich h4 { font-family: Lato_700Bold; font-size: 15px; line-height: 22px; margin: 10px 0 4px; }
.sparx-rich strong, .sparx-rich b { font-family: Lato_700Bold; }
.sparx-rich a { color: #166890; text-decoration: underline; }
.sparx-rich ul, .sparx-rich ol { margin: 4px 0 8px; padding-left: 20px; }
.sparx-rich li { margin: 2px 0; }
.sparx-rich blockquote { margin: 6px 0; padding-left: 12px; border-left: 3px solid #E3E8EF; color: #55636F; }
`;

let cssInjected = false;
function ensureCss() {
  if (cssInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = RICH_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

/**
 * Renders a community post/comment body. On web it renders sanitized HTML so the
 * Rails rich text (headers, bold, links) comes through; on native it falls back
 * to clean plain text. `numberOfLines` clamps the preview (CSS line-clamp on
 * web, numberOfLines on native).
 */
export function RichText({ html, numberOfLines }: { html: string; numberOfLines?: number }) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    ensureCss();
    const style: Record<string, unknown> = numberOfLines
      ? {
          display: '-webkit-box',
          WebkitLineClamp: String(numberOfLines),
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }
      : {};
    return createElement('div', {
      className: 'sparx-rich',
      style,
      dangerouslySetInnerHTML: { __html: sanitizeHtml(html) },
    });
  }
  return (
    <Txt variant="bodySm" numberOfLines={numberOfLines}>
      {htmlToText(html)}
    </Txt>
  );
}
