/**
 * Lesson exercises — domain helpers for the interactive worksheet flow
 * (spec: docs/lesson-exercises-spec.md).
 *
 * Definitions come from `mobile_lesson_exercises` (a lesson's titled worksheet
 * `profiles`, each with ordered questions); answers are saved per question as
 * the user advances (`mobile_exercise_responses`, latest wins) so a worksheet
 * is resumable from any device. ~68% of prompts are free-text, so this is a
 * guided reflection/journaling flow first, quiz second.
 */
import type { ExerciseQuestion, ExerciseResponse, ExerciseWorksheet } from '@/api/types';
import { htmlToText } from '@/lib/html';

/** Read-only kinds: shown as steps ('content') or hidden ('display'). */
export function isAnswerable(q: ExerciseQuestion): boolean {
  return q.inputKind !== 'content' && q.inputKind !== 'display';
}

/** The steps the runner walks through — everything except hidden computed
 *  'display' widgets (MVP hides those; 'content' renders as a read-only step). */
export function runnerQuestions(ws: ExerciseWorksheet): ExerciseQuestion[] {
  return ws.questions.filter((q) => q.inputKind !== 'display');
}

/** Whether a saved response actually answers its question (not just an empty
 *  string / empty selection left behind by a blur-save). */
export function hasValue(r: ExerciseResponse | undefined): boolean {
  if (!r) return false;
  if (r.valueText != null && r.valueText.trim() !== '') return true;
  if (Array.isArray(r.valueJson)) return r.valueJson.length > 0;
  return r.valueJson != null;
}

export type WorksheetProgress = { answered: number; total: number; complete: boolean };

/** Progress over the ANSWERABLE questions (content/display steps don't count). */
export function worksheetProgress(
  ws: ExerciseWorksheet,
  byQuestion: Map<string, ExerciseResponse>,
): WorksheetProgress {
  const answerable = ws.questions.filter(isAnswerable);
  const answered = answerable.filter((q) => hasValue(byQuestion.get(q.questionId))).length;
  return { answered, total: answerable.length, complete: answerable.length > 0 && answered === answerable.length };
}

/** Index responses by question id (the runner's lookup shape). */
export function responsesByQuestion(rows: ExerciseResponse[]): Map<string, ExerciseResponse> {
  const map = new Map<string, ExerciseResponse>();
  for (const r of rows) map.set(r.questionId, r);
  return map;
}

/** Legacy titles are sometimes bare outline numbers ("1", "2b") — real content
 *  in Module 1's "Exploring Your Beliefs". Those make ugly headings. */
const OUTLINE_TITLE = /^\d+[a-z]?[.)]?$/i;

/** The question's heading: the short plain title, else the prompt HTML as
 *  clean text (never raw HTML — see the spec's sanitize note). */
export function questionHeading(q: ExerciseQuestion): string {
  const t = q.title?.trim();
  if (t && !OUTLINE_TITLE.test(t)) return t;
  return htmlToText(q.promptHtml ?? '').split('\n')[0] ?? t ?? '';
}

/** Scale labels for the endpoints (legacy stores Likert labels as options). */
export function scaleEndpoints(q: ExerciseQuestion): { low: string | null; high: string | null } {
  if (q.options.length === 0) return { low: null, high: null };
  return { low: q.options[0] ?? null, high: q.options[q.options.length - 1] ?? null };
}

/** A saved answer as display text (worksheet review + the Sparxy summary). */
export function answerText(q: ExerciseQuestion, r: ExerciseResponse | undefined): string {
  if (!hasValue(r) || !r) return '';
  if (r.valueText != null && r.valueText.trim() !== '') return r.valueText.trim();
  if (Array.isArray(r.valueJson)) return r.valueJson.map(String).join(', ');
  if (q.inputKind === 'scale' && typeof r.valueJson === 'number') {
    // Show the option label for the picked point when the legacy sheet has one.
    const min = q.minValue ?? 0;
    const label = q.options[r.valueJson - min];
    return label ? `${r.valueJson} — ${label}` : String(r.valueJson);
  }
  return String(r.valueJson);
}

// ---------------------------------------------------------------------------
// Statement sheets — fill-in-the-blank worksheets (e.g. Module 1's "Hero
// Personal Power Statement", "Hero Code") whose answers compose into one
// personal statement the member can read in full, print, and share.
// ---------------------------------------------------------------------------

/** A worksheet reads as a fill-in statement when every answerable question is
 *  a SHORT text blank (the mad-libs shape) — reflections/quizzes don't apply. */
export function isStatementSheet(ws: ExerciseWorksheet): boolean {
  const answerable = ws.questions.filter(isAnswerable);
  return answerable.length >= 2 && answerable.every((q) => q.inputKind === 'text');
}

/** The legacy "Post to Community" content block, when the sheet carries one —
 *  the data signal that this statement should offer sharing to the community. */
export function communityCtaQuestion(ws: ExerciseWorksheet): ExerciseQuestion | null {
  return ws.questions.find((q) => /post .*communit/i.test(q.title ?? '')) ?? null;
}

/** One line of a composed statement: the worksheet's lead text plus, for
 *  blanks, the member's own words. */
export type StatementSegment = { lead: string; answer: string | null };

/**
 * Stitch a statement sheet's prompts + the member's answers into the full
 * statement, in worksheet order. Content interludes (e.g. "Never give up")
 * become lead-only lines; the community-CTA block is excluded (it's a button,
 * not statement text). Unanswered blanks are skipped.
 */
export function composeStatement(
  ws: ExerciseWorksheet,
  byQuestion: Map<string, ExerciseResponse>,
): StatementSegment[] {
  const cta = communityCtaQuestion(ws);
  const out: StatementSegment[] = [];
  for (const q of ws.questions) {
    if (q.inputKind === 'display' || q.questionId === cta?.questionId) continue;
    const lead = htmlToText(q.promptHtml ?? '').trim() || q.title?.trim() || '';
    if (!lead) continue;
    if (!isAnswerable(q)) {
      out.push({ lead, answer: null });
      continue;
    }
    const a = answerText(q, byQuestion.get(q.questionId));
    if (a) out.push({ lead, answer: a });
  }
  return out;
}

/** The composed statement as plain text — used to prefill a community post. */
export function statementText(segments: StatementSegment[]): string {
  return segments
    .map((s) => (s.answer ? `${s.lead}\n${s.answer}` : s.lead))
    .join('\n\n')
    .trim();
}

/**
 * Condense the user's answers into a compact plain-text block for the Sparxy
 * summary prompt (and future journal views). Free-text answers are clipped so
 * a long reflection can't blow up the webhook payload.
 */
export function answersSummary(
  worksheets: ExerciseWorksheet[],
  byQuestion: Map<string, ExerciseResponse>,
  maxAnswerChars = 400,
): string {
  const parts: string[] = [];
  for (const ws of worksheets) {
    const lines: string[] = [];
    for (const q of ws.questions) {
      if (!isAnswerable(q)) continue;
      const a = answerText(q, byQuestion.get(q.questionId));
      if (!a) continue;
      const clipped = a.length > maxAnswerChars ? `${a.slice(0, maxAnswerChars)}…` : a;
      lines.push(`- ${questionHeading(q)}: ${clipped}`);
    }
    if (lines.length) parts.push(`${ws.title}:\n${lines.join('\n')}`);
  }
  return parts.join('\n\n');
}
