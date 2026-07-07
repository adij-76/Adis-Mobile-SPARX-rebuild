/**
 * Worksheet scoring — rebuilt app-side, per instrument.
 *
 * The legacy Rails app computed scores in application code (the DB's
 * compute_type/source_id are empty — see docs/db-migration-catalogue.md), so
 * each scored worksheet gets an explicit recipe here. On completion the score
 * is SAVED WITH ITS DATE as an append-only mobile_assessment_responses row
 * (instrument key below), so retakes build a dated history for later
 * comparison — and Sparxy's context picks it up automatically.
 *
 * Sheets are matched by TITLE (content-driven, like statement sheets), so the
 * mapping survives profile-id changes and works against the mock in dev.
 */
import type { ExerciseQuestion, ExerciseResponse, ExerciseWorksheet } from '@/api/types';
import { hasValue, isAnswerable, worksheetProgress } from '@/lib/exercises';

export type ScoreBand = {
  /** Ascending; the first band whose max ≥ score wins. */
  max: number;
  label: string;
  tone: 'good' | 'mild' | 'warn' | 'alert';
  /** Supportive explanation shown with the result — never clinical/alarming. */
  note: string;
};

export type SheetScoring = {
  /** Instrument key stored in mobile_assessment_responses (dated history). */
  instrument: string;
  /** Display name on the result screen + worksheet card. */
  name: string;
  /** Sheet-title signal that this recipe applies. */
  match: RegExp;
  /** Gentle framing shown above the score — context before numbers. */
  framing: string;
  bands: ScoreBand[];
  /** Score a COMPLETE sheet; null when it can't be scored. Also returns the
   *  per-question numeric answers for the stored row. */
  compute(
    ws: ExerciseWorksheet,
    byQuestion: Map<string, ExerciseResponse>,
  ): { score: number; max: number; answers: Record<string, number> } | null;
};

/** Count of "Yes" answers across a sheet's Yes/No selects. */
function countYes(
  ws: ExerciseWorksheet,
  byQuestion: Map<string, ExerciseResponse>,
): { score: number; max: number; answers: Record<string, number> } | null {
  const items = ws.questions.filter(
    (q: ExerciseQuestion) => isAnswerable(q) && q.inputKind === 'select' && q.options.some((o) => /^yes/i.test(o)),
  );
  if (items.length === 0) return null;
  const answers: Record<string, number> = {};
  let score = 0;
  for (const q of items) {
    const r = byQuestion.get(q.questionId);
    if (!hasValue(r)) return null; // incomplete → no score
    const yes = /^yes/i.test(r?.valueText ?? '') ? 1 : 0;
    answers[q.questionId] = yes;
    score += yes;
  }
  return { score, max: items.length, answers };
}

export const SHEET_SCORING: SheetScoring[] = [
  {
    instrument: 'ace',
    name: 'ACE',
    match: /adverse childhood/i,
    // ⚠ This is IGNTD's EXPANDED questionnaire (19 items, vs the traditional
    // 10), so the classic "4+" research threshold does NOT apply — per Adi,
    // 5+ is treated as a likely indicator of serious developmental trauma,
    // always framed gently.
    framing:
      'This is a wider look at early experiences than the traditional ACE questionnaire, ' +
      'so the number itself matters less than what it points to. Whatever your score, it ' +
      'describes what happened to you — not who you are, and not where you can go from here.',
    bands: [
      {
        max: 0,
        label: 'No early adversity reported',
        tone: 'good',
        note: 'You reported none of these experiences. Everything in this program still applies — early experiences are one lens among many.',
      },
      {
        max: 4,
        label: 'Some early adversity',
        tone: 'mild',
        note: 'You carried some difficult experiences out of childhood. Naming them, like you just did, is a real step — they help explain patterns, never define limits.',
      },
      {
        max: 99,
        label: 'Significant early adversity',
        tone: 'warn',
        note: 'A score of 5 or more often points to serious developmental trauma — early experiences that genuinely shaped how you cope today. That is not a life sentence: developmental trauma responds to the kind of work you are doing right now, and it is worth exploring with your coach or a therapist who works with trauma. You did something brave by answering honestly.',
      },
    ],
    compute: countYes,
  },
];

/** The scoring recipe for a worksheet, if it has one. */
export function scoringFor(ws: ExerciseWorksheet): SheetScoring | null {
  return SHEET_SCORING.find((s) => s.match.test(ws.title)) ?? null;
}

/** Band for a score (first band whose max covers it). */
export function bandForScore(s: SheetScoring, score: number): ScoreBand {
  return s.bands.find((b) => score <= b.max) ?? s.bands[s.bands.length - 1];
}

/** Compute a sheet's score when it's complete and scorable (else null). */
export function sheetScore(
  ws: ExerciseWorksheet,
  byQuestion: Map<string, ExerciseResponse>,
): { scoring: SheetScoring; score: number; max: number; answers: Record<string, number> } | null {
  const scoring = scoringFor(ws);
  if (!scoring || !worksheetProgress(ws, byQuestion).complete) return null;
  const r = scoring.compute(ws, byQuestion);
  return r ? { scoring, ...r } : null;
}
