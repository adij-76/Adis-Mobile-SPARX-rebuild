/**
 * Lesson exercises — the interactive worksheet experience
 * (spec: docs/lesson-exercises-spec.md).
 *
 * A lesson's exercises are titled worksheets (legacy `profiles`), each a guided
 * stepper: ONE prompt at a time with a progress bar, mixed input kinds
 * (free-text reflection first and foremost, plus scale / choice / date and
 * read-only content blocks), save-on-advance so leaving and returning resumes
 * exactly where the user stopped, and +XP with a celebration when a worksheet
 * is completed for the first time.
 *
 * `useLessonExercises` owns the data (definitions + the user's answers) so the
 * lesson screen can share it with the Sparxy summary step.
 */
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import type { ExerciseQuestion, ExerciseResponse, ExerciseWorksheet } from '@/api/types';
import { Confetti } from '@/components/confetti';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { RankMovement } from '@/components/ui/rank-movement';
import { RichText } from '@/components/ui/rich-text';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { PrintRow, StatementView } from '@/components/statement-view';
import { useAuth } from '@/lib/auth';
import { htmlToText } from '@/lib/html';
import {
  hasValue,
  isAnswerable,
  isLabeledScale,
  isStatementSheet,
  questionHeading,
  responsesByQuestion,
  runnerQuestions,
  scaleEndpoints,
  worksheetProgress,
} from '@/lib/exercises';
import { PRINT_LOOKS, printContent } from '@/lib/print';
import { useStore } from '@/lib/store';
import { XP_BASE } from '@/lib/xp';
import { useXpAward, type XpMovement } from '@/lib/xp-award';

// ---------------------------------------------------------------------------
// Data hook — shared by the Exercises step and the Sparxy summary step.
// ---------------------------------------------------------------------------

export type LessonExercisesState = {
  loading: boolean;
  error: boolean;
  worksheets: ExerciseWorksheet[];
  /** The user's latest answer per question (live — updates as they type/save). */
  byQuestion: Map<string, ExerciseResponse>;
  /** Worksheets already fully answered when the screen loaded (retakes — no
   *  re-award). */
  initiallyComplete: Set<string>;
  /** Persist one answer (optimistic locally, upsert remotely). */
  saveAnswer(ws: ExerciseWorksheet, q: ExerciseQuestion, value: AnswerValue): void;
};

export type AnswerValue = { text?: string | null; json?: unknown };

export function useLessonExercises(lessonId: string | null): LessonExercisesState {
  const { user } = useAuth();
  const appUserId = user?.appUserId ?? null;
  const [worksheets, setWorksheets] = useState<ExerciseWorksheet[]>([]);
  const [byQuestion, setByQuestion] = useState<Map<string, ExerciseResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const initiallyComplete = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    setWorksheets([]);
    setByQuestion(new Map());
    initiallyComplete.current = new Set();
    if (!lessonId) {
      setLoading(false);
      return;
    }
    Promise.all([api.exercises.forLesson(lessonId), api.exercises.responses(lessonId)])
      .then(([sheets, responses]) => {
        if (!alive) return;
        const map = responsesByQuestion(responses);
        initiallyComplete.current = new Set(
          sheets.filter((ws) => worksheetProgress(ws, map).complete).map((ws) => ws.profileId),
        );
        setWorksheets(sheets);
        setByQuestion(map);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [lessonId]);

  const saveAnswer = useCallback(
    (ws: ExerciseWorksheet, q: ExerciseQuestion, value: AnswerValue) => {
      const record: ExerciseResponse = {
        lessonId: ws.lessonId,
        profileId: ws.profileId,
        questionId: q.questionId,
        valueText: value.text ?? null,
        valueJson: value.json ?? null,
        answeredAt: new Date().toISOString(),
      };
      // Optimistic: the UI (progress, summary) reflects the answer immediately;
      // the upsert is fire-and-forget (repeating it later is always safe).
      setByQuestion((m) => new Map(m).set(q.questionId, record));
      api.exercises
        .save(
          {
            lessonId: ws.lessonId,
            profileId: ws.profileId,
            questionId: q.questionId,
            valueText: record.valueText,
            valueJson: record.valueJson,
          },
          appUserId,
        )
        .catch(() => {});
    },
    [appUserId],
  );

  return {
    loading,
    error,
    worksheets,
    byQuestion,
    initiallyComplete: initiallyComplete.current,
    saveAnswer,
  };
}

// ---------------------------------------------------------------------------
// The Exercises step: worksheet list → per-worksheet guided stepper.
// ---------------------------------------------------------------------------

type ActiveSheet = { ws: ExerciseWorksheet; mode: 'run' | 'statement' };

export function ExercisesSection({ ex }: { ex: LessonExercisesState }) {
  const { awardXp } = useStore();
  const award = useXpAward();
  const [active, setActive] = useState<ActiveSheet | null>(null);
  const [celebrate, setCelebrate] = useState<{
    title: string;
    earned: number;
    movement: XpMovement | null;
    /** Statement sheet to reveal after the celebration ("and THEN post it"). */
    next: ExerciseWorksheet | null;
  } | null>(null);
  // Guards a double-award if a worksheet is reopened + refinished this session.
  const awarded = useRef<Set<string>>(new Set());

  const finish = (ws: ExerciseWorksheet, byQuestion: Map<string, ExerciseResponse>) => {
    const complete = worksheetProgress(ws, byQuestion).complete;
    // Fill-in sheets reveal the composed statement once they're done.
    const statement = complete && isStatementSheet(ws) ? ws : null;
    const firstCompletion =
      complete && !ex.initiallyComplete.has(ws.profileId) && !awarded.current.has(ws.profileId);
    if (!firstCompletion) {
      setActive(statement ? { ws: statement, mode: 'statement' } : null);
      return;
    }
    setActive(null);
    awarded.current.add(ws.profileId);
    const earned = awardXp(XP_BASE.worksheet_complete);
    setCelebrate({ title: ws.title, earned, movement: null, next: statement });
    if (earned > 0) {
      award({ source: 'exercise', refId: ws.profileId, points: earned }).then((m) =>
        setCelebrate((c) => (c ? { ...c, movement: m } : c)),
      );
    }
  };

  if (ex.loading) {
    return (
      <View style={styles.infoBox}>
        <Ionicons name="hourglass-outline" size={20} color={Colors.textSub} />
        <Txt variant="bodySm" color={Colors.textSub} style={{ flex: 1 }}>
          Loading your exercises…
        </Txt>
      </View>
    );
  }

  if (ex.error || ex.worksheets.length === 0) {
    return (
      <View style={styles.infoBox}>
        <Ionicons name="document-text-outline" size={20} color={Colors.textSub} />
        <Txt variant="bodySm" color={Colors.textSub} style={{ flex: 1 }}>
          {ex.error
            ? "Couldn't load the exercises right now — they'll be here when you're back online."
            : // Exercises roll out module by module (mobile_exercise_rollout),
              // so an empty result usually means "not yet", not "never".
              'Interactive exercises for this lesson are coming soon — for now, follow along with the walkthrough above.'}
        </Txt>
      </View>
    );
  }

  // A sheet of only hidden computed 'display' widgets has nothing to run —
  // don't list it (module 3 is display-heavy; guards future content too).
  const visibleSheets = ex.worksheets.filter((ws) => runnerQuestions(ws).length > 0);

  return (
    <View style={{ gap: Spacing.md }}>
      {visibleSheets.map((ws) => {
        const p = worksheetProgress(ws, ex.byQuestion);
        const state = p.complete ? 'done' : p.answered > 0 ? 'resume' : 'start';
        // A finished fill-in sheet opens on its composed statement (read/print/
        // share), with Edit to get back into the runner.
        const mode = p.complete && isStatementSheet(ws) ? 'statement' : 'run';
        return (
          <Pressable key={ws.profileId} style={styles.sheetCard} onPress={() => setActive({ ws, mode })}>
            <View style={[styles.sheetIcon, p.complete && styles.sheetIconDone]}>
              <Ionicons
                name={p.complete ? 'checkmark' : 'create-outline'}
                size={20}
                color={p.complete ? Colors.white : Colors.primary}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="bodyMedium">{ws.title}</Txt>
              <ProgressBar
                progress={p.total > 0 ? p.answered / p.total : 0}
                track={Colors.soft}
                fill={p.complete ? Colors.success : Colors.primary}
              />
              <Txt variant="caption" color={Colors.textSub}>
                {p.complete
                  ? 'Complete — tap to review'
                  : `${p.answered}/${p.total} answered${state === 'resume' ? ' · continue where you left off' : ''}`}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.strokeStrong} />
          </Pressable>
        );
      })}

      <Modal
        visible={!!active}
        animationType="slide"
        onRequestClose={() => setActive(null)}
        presentationStyle="fullScreen">
        {active?.mode === 'statement' ? (
          <StatementView
            worksheet={active.ws}
            byQuestion={ex.byQuestion}
            onEdit={() => setActive({ ws: active.ws, mode: 'run' })}
            onClose={() => setActive(null)}
          />
        ) : active ? (
          <WorksheetRunner
            worksheet={active.ws}
            byQuestion={ex.byQuestion}
            onSave={(q, v) => ex.saveAnswer(active.ws, q, v)}
            onClose={() => setActive(null)}
            onFinish={(byQ) => finish(active.ws, byQ)}
          />
        ) : (
          <View />
        )}
      </Modal>

      <Modal visible={!!celebrate} animationType="fade" onRequestClose={() => setCelebrate(null)}>
        {celebrate ? (
          <WorksheetCelebration
            title={celebrate.title}
            earned={celebrate.earned}
            movement={celebrate.movement}
            onDone={() => {
              const next = celebrate.next;
              setCelebrate(null);
              if (next) setActive({ ws: next, mode: 'statement' });
            }}
          />
        ) : (
          <View />
        )}
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The guided stepper — one prompt per screen, save on advance.
// ---------------------------------------------------------------------------

function WorksheetRunner({
  worksheet,
  byQuestion,
  onSave,
  onClose,
  onFinish,
}: {
  worksheet: ExerciseWorksheet;
  byQuestion: Map<string, ExerciseResponse>;
  onSave: (q: ExerciseQuestion, value: AnswerValue) => void;
  onClose: () => void;
  onFinish: (byQuestion: Map<string, ExerciseResponse>) => void;
}) {
  const steps = useMemo(() => runnerQuestions(worksheet), [worksheet]);
  // Fresh sheet (or full review) starts at the top; a partially answered one
  // resumes at the first unanswered question.
  const anyAnswered = steps.some((q) => hasValue(byQuestion.get(q.questionId)));
  const firstOpen = steps.findIndex((q) => isAnswerable(q) && !hasValue(byQuestion.get(q.questionId)));
  const [step, setStep] = useState(anyAnswered && firstOpen !== -1 ? firstOpen : 0);
  const q = steps[step];

  // Draft value for the CURRENT question, seeded from the saved answer.
  const saved = q ? byQuestion.get(q.questionId) : undefined;
  const [draft, setDraft] = useState<AnswerValue>(() => seedDraft(q, saved));
  useEffect(() => {
    setDraft(seedDraft(q, q ? byQuestion.get(q.questionId) : undefined));
    // Reseed only when the step changes — while typing, draft is the truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.questionId]);

  if (!q) {
    // A worksheet of only hidden 'display' widgets — nothing to run.
    onClose();
    return <View />;
  }

  const draftHas =
    (draft.text != null && draft.text.trim() !== '') ||
    (Array.isArray(draft.json) ? draft.json.length > 0 : draft.json != null);

  /** Persist the current draft (no-op for read-only steps / empty drafts). */
  const commit = (): Map<string, ExerciseResponse> => {
    if (!isAnswerable(q) || !draftHas) return byQuestion;
    onSave(q, draft);
    // Mirror the optimistic update for the synchronous completion check.
    return new Map(byQuestion).set(q.questionId, {
      lessonId: worksheet.lessonId,
      profileId: worksheet.profileId,
      questionId: q.questionId,
      valueText: draft.text ?? null,
      valueJson: draft.json ?? null,
      answeredAt: new Date().toISOString(),
    });
  };

  const last = step === steps.length - 1;
  const next = () => {
    const updated = commit();
    if (last) onFinish(updated);
    else setStep((s) => s + 1);
  };
  const back = () => {
    commit();
    setStep((s) => Math.max(0, s - 1));
  };

  const blocked = q.required && isAnswerable(q) && !draftHas;

  // Content blocks render their (sanitized) HTML as the body itself; questions
  // show a plain heading plus the prompt when it adds more than the heading.
  const heading = q.inputKind === 'content' ? null : questionHeading(q);
  const promptText = htmlToText(q.promptHtml ?? '').trim();
  const showPrompt = !!q.promptHtml && promptText !== '' && promptText !== heading;

  return (
    <SafeAreaView style={styles.runnerSafe} edges={['top', 'bottom']}>
      <View style={styles.runnerTop}>
        <Pressable onPress={() => { commit(); onClose(); }} hitSlop={12}>
          <Ionicons name="close" size={24} color={Colors.textMain} />
        </Pressable>
        <Txt variant="bodySmMedium" numberOfLines={1} style={{ flex: 1 }} color={Colors.textSub}>
          {worksheet.title}
        </Txt>
        <Txt variant="caption" color={Colors.textSub}>
          {step + 1}/{steps.length}
        </Txt>
      </View>
      <View style={styles.runnerProgress}>
        <ProgressBar progress={(step + 1) / steps.length} track={Colors.soft} fill={Colors.primary} />
      </View>

      <ScrollView
        contentContainerStyle={styles.runnerBody}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {heading ? <Txt variant="title">{heading}</Txt> : null}
        {showPrompt ? <RichText html={q.promptHtml!} /> : null}
        {q.inputKind === 'content' && q.promptHtml ? (
          // Wall-worthy content (the Hero Manifesto, the tips) can be printed
          // in a look the member picks — web only.
          <PrintRow
            label="Print & post it on your wall"
            onPick={(lookId) =>
              printContent(
                q.title?.trim() || worksheet.title,
                q.promptHtml!,
                PRINT_LOOKS.find((l) => l.id === lookId) ?? PRINT_LOOKS[0],
              )
            }
          />
        ) : null}
        <QuestionInput q={q} value={draft} onChange={setDraft} />
      </ScrollView>

      <View style={styles.runnerFooter}>
        <View style={{ flex: 1 }}>
          <Button
            title="Back"
            variant="secondary"
            iconLeft="chevron-back"
            disabled={step === 0}
            onPress={back}
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button
            title={last ? 'Finish' : q.inputKind === 'content' ? 'Continue' : 'Next'}
            variant="primary"
            iconRight={last ? undefined : 'chevron-forward'}
            disabled={blocked}
            onPress={next}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function seedDraft(q: ExerciseQuestion | undefined, saved: ExerciseResponse | undefined): AnswerValue {
  if (!q || !saved || !hasValue(saved)) return {};
  return { text: saved.valueText, json: saved.valueJson };
}

// ---------------------------------------------------------------------------
// Inputs by kind.
// ---------------------------------------------------------------------------

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: ExerciseQuestion;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  switch (q.inputKind) {
    case 'longtext':
      return (
        <TextInput
          style={[styles.input, styles.inputLong]}
          multiline
          textAlignVertical="top"
          placeholder="Write your reflection…"
          placeholderTextColor={Colors.textSub}
          value={value.text ?? ''}
          onChangeText={(t) => onChange({ text: t })}
        />
      );
    case 'text':
      return (
        <TextInput
          style={styles.input}
          placeholder="Your answer…"
          placeholderTextColor={Colors.textSub}
          value={value.text ?? ''}
          onChangeText={(t) => onChange({ text: t })}
        />
      );
    case 'date':
      return (
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textSub}
          keyboardType="numbers-and-punctuation"
          value={value.text ?? ''}
          onChangeText={(t) => onChange({ text: t })}
        />
      );
    case 'scale': {
      // Real legacy scales are labeled Likert lists (min/max unset or 0/0, the
      // labels in options) — render those as tappable rows and store BOTH the
      // 0-based index (analytics) and the label (readable everywhere).
      if (isLabeledScale(q)) {
        const pickedIdx = typeof value.json === 'number' ? value.json : null;
        return (
          <View style={{ gap: Spacing.sm }}>
            {q.options.map((o, i) => {
              const on = pickedIdx === i;
              return (
                <Pressable
                  key={`${i}-${o}`}
                  onPress={() => onChange({ json: i, text: o })}
                  style={[styles.optionRow, on && styles.optionRowOn]}>
                  <Ionicons
                    name={on ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={on ? Colors.primary : Colors.strokeStrong}
                  />
                  <Txt variant="bodySm" color={on ? Colors.primary : Colors.textMain} style={{ flex: 1 }}>
                    {o}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        );
      }
      const min = q.minValue ?? 0;
      const max = q.maxValue ?? Math.max(min + 4, min + q.options.length - 1);
      const points = Array.from({ length: Math.max(2, max - min + 1) }, (_, i) => min + i);
      const picked = typeof value.json === 'number' ? value.json : null;
      const { low, high } = scaleEndpoints(q);
      const pickedLabel = picked != null ? q.options[picked - min] : null;
      return (
        <View style={{ gap: Spacing.sm }}>
          <View style={styles.scaleRow}>
            {points.map((p) => {
              const on = picked === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => onChange({ json: p })}
                  style={[styles.scaleDot, on && styles.scaleDotOn]}>
                  <Txt variant="bodyMedium" color={on ? Colors.white : Colors.textMain}>
                    {p}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
          {(low || high) && (
            <View style={styles.scaleEnds}>
              <Txt variant="caption" color={Colors.textSub} style={{ flex: 1 }}>
                {low ?? ''}
              </Txt>
              <Txt variant="caption" color={Colors.textSub} style={{ textAlign: 'right', flex: 1 }}>
                {high ?? ''}
              </Txt>
            </View>
          )}
          {pickedLabel && low !== pickedLabel && high !== pickedLabel ? (
            <Txt variant="bodySm" color={Colors.primary} center>
              {pickedLabel}
            </Txt>
          ) : null}
        </View>
      );
    }
    case 'select':
      return (
        <View style={{ gap: Spacing.sm }}>
          {q.options.map((o) => {
            const on = value.text === o;
            return (
              <Pressable
                key={o}
                onPress={() => onChange({ text: o })}
                style={[styles.optionRow, on && styles.optionRowOn]}>
                <Ionicons
                  name={on ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={on ? Colors.primary : Colors.strokeStrong}
                />
                <Txt variant="bodySm" color={on ? Colors.primary : Colors.textMain} style={{ flex: 1 }}>
                  {o}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      );
    case 'multiselect': {
      const picked = Array.isArray(value.json) ? value.json.map(String) : [];
      const toggle = (o: string) =>
        onChange({ json: picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o] });
      return (
        <View style={{ gap: Spacing.sm }}>
          {q.options.map((o) => {
            const on = picked.includes(o);
            return (
              <Pressable key={o} onPress={() => toggle(o)} style={[styles.optionRow, on && styles.optionRowOn]}>
                <Ionicons
                  name={on ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={on ? Colors.primary : Colors.strokeStrong}
                />
                <Txt variant="bodySm" color={on ? Colors.primary : Colors.textMain} style={{ flex: 1 }}>
                  {o}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      );
    }
    case 'content':
    case 'display':
    default:
      return null; // content renders via RichText above; display is hidden
  }
}

// ---------------------------------------------------------------------------
// Celebration — mirrors LessonComplete / PostCelebration so finishing a
// worksheet feels exactly as rewarding as the rest of the app.
// ---------------------------------------------------------------------------

function WorksheetCelebration({
  title,
  earned,
  movement,
  onDone,
}: {
  title: string;
  earned: number;
  movement: XpMovement | null;
  onDone: () => void;
}) {
  return (
    <View style={styles.ackRoot}>
      <Confetti />
      <SafeAreaView style={styles.ackSafe} edges={['top', 'bottom']}>
        <View style={styles.ackCenter}>
          <View style={styles.ackStar}>
            <Ionicons name="create" size={48} color={Colors.primaryDarker} />
          </View>
          <Txt variant="display" color={Colors.white} center style={{ marginTop: Spacing.xl }}>
            Worksheet complete!
          </Txt>
          <Txt variant="body" color={Colors.textMutedOnDark} center style={{ marginTop: Spacing.sm }}>
            “{title}” is done. Writing it down is doing the work — well done.
          </Txt>
          {earned > 0 ? (
            <View style={styles.ackReward}>
              <Txt variant="display" color={Colors.orange}>
                +{earned}
              </Txt>
              <Txt variant="caption" color={Colors.textMutedOnDark}>
                XP earned
              </Txt>
            </View>
          ) : null}
          {earned > 0 ? (
            <View style={{ marginTop: Spacing.lg }}>
              <RankMovement movement={movement} />
            </View>
          ) : null}
          <View style={styles.ackButtonWrap}>
            <Button title="Continue" variant="white" onPress={onDone} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  sheetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
  },
  sheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetIconDone: { backgroundColor: Colors.success },
  // runner
  runnerSafe: { flex: 1, backgroundColor: Colors.white },
  runnerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  runnerProgress: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  runnerBody: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flexGrow: 1,
  },
  runnerFooter: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg },
  input: {
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    backgroundColor: Colors.screen,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: Colors.textMain,
  },
  inputLong: { minHeight: 160 },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  scaleDot: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  scaleDotOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  scaleEnds: { flexDirection: 'row', gap: Spacing.md },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  optionRowOn: { borderColor: Colors.primary, backgroundColor: 'rgba(22,104,144,0.06)' },
  // celebration
  ackRoot: { flex: 1, backgroundColor: Colors.primaryDarker },
  ackSafe: { flex: 1, paddingHorizontal: Spacing.lg },
  ackCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ackStar: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: Colors.star,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ackReward: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
  },
  ackButtonWrap: { marginTop: Spacing.xxl, width: '100%', maxWidth: 280, alignSelf: 'center' },
});
