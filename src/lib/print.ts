/**
 * Print-quality renders of exercise content — the "beautifully rendered image
 * you can print and post on your wall" experience for the IGNTD Hero Manifesto
 * and composed personal statements.
 *
 * Web-only (window.print → paper or Save-as-PDF): we open a self-contained
 * document (inline CSS, system font stacks, no external requests) styled by
 * one of a few LOOKS the member picks from. Native builds hide the option
 * (the PWA is the shipping surface today).
 */
import { Platform } from 'react-native';

import { sanitizeHtml } from '@/lib/html';
import type { StatementSegment } from '@/lib/exercises';

export type PrintLook = {
  id: string;
  name: string;
  /** Swatch colors for the in-app look picker chip. */
  swatch: { bg: string; fg: string; accent: string };
  css: string;
};

/** A few distinct looks so everyone finds one they love. All print-safe
 *  (print-color-adjust preserves the backgrounds when saving as PDF). */
export const PRINT_LOOKS: PrintLook[] = [
  {
    id: 'classic',
    name: 'Classic',
    swatch: { bg: '#FBF7EE', fg: '#2C2A26', accent: '#B98A2F' },
    css: `
      body { background: #FBF7EE; color: #2C2A26; font-family: Georgia, 'Iowan Old Style', 'Times New Roman', serif; }
      .sheet { border: 2px solid #B98A2F; outline: 1px solid #B98A2F; outline-offset: 6px; background: #FFFDF7; }
      h1 { font-variant: small-caps; letter-spacing: 3px; color: #8A661F; font-weight: 600; }
      .rule { color: #B98A2F; }
      .lead { color: #6B6256; }
      .answer { color: #2C2A26; }
      .foot { color: #A08A5F; }
    `,
  },
  {
    id: 'bold',
    name: 'Bold',
    swatch: { bg: '#0E2A3A', fg: '#FFFFFF', accent: '#F08A3C' },
    css: `
      body { background: #0E2A3A; color: #F4F7F9; font-family: 'Avenir Next', 'Helvetica Neue', Arial, sans-serif; }
      .sheet { background: #103144; border: 1px solid rgba(255,255,255,0.18); }
      h1 { color: #FFFFFF; text-transform: uppercase; letter-spacing: 4px; font-weight: 800; }
      .rule { color: #F08A3C; }
      .lead { color: #9FB6C4; }
      .answer { color: #FFD9B8; }
      .foot { color: #7E97A6; }
    `,
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    swatch: { bg: '#FFF1E3', fg: '#4A3728', accent: '#E4732E' },
    css: `
      body { background: linear-gradient(160deg, #FFE8D2 0%, #FFF7EE 55%, #FFFFFF 100%); color: #4A3728; font-family: 'Avenir Next', 'Segoe UI', 'Helvetica Neue', sans-serif; }
      .sheet { background: rgba(255,255,255,0.82); border-radius: 18px; box-shadow: 0 10px 40px rgba(228,115,46,0.16); }
      h1 { color: #E4732E; font-weight: 800; letter-spacing: 1px; }
      .rule { color: #E4732E; }
      .lead { color: #97785F; }
      .answer { color: #4A3728; }
      .foot { color: #C29A76; }
    `,
  },
];

export const printAvailable = Platform.OS === 'web';

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .sheet { max-width: 720px; width: 100%; padding: 56px 60px; }
  h1 { font-size: 26px; text-align: center; margin-bottom: 6px; }
  .rule { text-align: center; font-size: 18px; margin-bottom: 28px; }
  .content { font-size: 16px; line-height: 1.75; }
  .content p { margin: 0 0 12px; }
  .content strong, .content b { font-weight: 700; }
  .seg { margin-bottom: 20px; text-align: center; }
  .lead { font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
  .answer { font-size: 21px; line-height: 1.5; font-weight: 600; }
  .foot { margin-top: 34px; text-align: center; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
  .actions { position: fixed; top: 14px; right: 14px; display: flex; gap: 8px; }
  .actions button { border: 0; border-radius: 999px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; background: #166890; color: #fff; }
  @media print { .actions { display: none; } body { padding: 0; } }
`;

function openDoc(title: string, bodyHtml: string, look: PrintLook): void {
  if (!printAvailable || typeof window === 'undefined') return;
  const win = window.open('', '_blank');
  if (!win) return; // popup blocked — the button is a direct user gesture, so rare
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>${BASE_CSS}${look.css}</style></head>
    <body>
      <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
      <div class="sheet">${bodyHtml}</div>
    </body></html>`);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Print a rich-content block (e.g. the IGNTD Hero Manifesto). The HTML goes
 *  through the same sanitizer the app renders with — never raw. */
export function printContent(title: string, html: string, look: PrintLook): void {
  openDoc(
    title,
    `<h1>${escapeHtml(title)}</h1><div class="rule">✦</div>
     <div class="content">${sanitizeHtml(html)}</div>
     <div class="foot">SPARx · IGNTD</div>`,
    look,
  );
}

/** Print a composed personal statement (lead lines + the member's answers). */
export function printStatement(title: string, segments: StatementSegment[], look: PrintLook): void {
  const body = segments
    .map((s) =>
      s.answer
        ? `<div class="seg"><div class="lead">${escapeHtml(s.lead)}</div><div class="answer">${escapeHtml(s.answer)}</div></div>`
        : `<div class="seg"><div class="answer">${escapeHtml(s.lead)}</div></div>`,
    )
    .join('');
  openDoc(
    title,
    `<h1>${escapeHtml(title)}</h1><div class="rule">✦</div>${body}
     <div class="foot">SPARx · IGNTD</div>`,
    look,
  );
}
