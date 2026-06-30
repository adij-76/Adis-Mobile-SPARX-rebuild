/**
 * Small formatting helpers shared across content screens (videos, modules,
 * lessons). Kept in one place so the title/description rules stay consistent.
 */
import type { Lesson } from '@/api/types';

/** Human title for a lesson/workshop: explicit title → nav title → first
 *  sentence of the description → generic fallback. */
export function lessonTitle(l: Lesson): string {
  return l.title || l.navTitle || (l.description ? l.description.split(/[.!?]/)[0] : '') || 'Lesson';
}

/** `mm:ss` from a length in seconds, or null when there's nothing useful. */
export function formatLength(sec: number | null): string | null {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Whether a description is real content vs. a "no description" placeholder. */
export const hasRealDescription = (d: string | null): boolean => !!d && !/no description/i.test(d);
