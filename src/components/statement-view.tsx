/**
 * StatementView — the "your statement, in full form" page shown when a
 * fill-in-the-blank worksheet (Hero Personal Power Statement, Hero Code, …)
 * is complete. The member reads their composed statement, can print it in a
 * look they love (poster for the wall), and — when the sheet carries the
 * legacy "Post to Community" block — share it straight into the community
 * with the post pre-filled.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ExerciseResponse, ExerciseWorksheet } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { composeStatement, statementText } from '@/lib/exercises';
import { PRINT_LOOKS, printAvailable, printStatement } from '@/lib/print';

/** In-app look picker + print trigger, shared with content-step printing. */
export function PrintRow({ onPick, label }: { onPick: (lookId: string) => void; label: string }) {
  if (!printAvailable) return null;
  return (
    <View style={styles.printRow}>
      <View style={styles.printLabel}>
        <Ionicons name="print-outline" size={16} color={Colors.textSub} />
        <Txt variant="caption" color={Colors.textSub}>
          {label}
        </Txt>
      </View>
      <View style={styles.swatches}>
        {PRINT_LOOKS.map((l) => (
          <Pressable key={l.id} onPress={() => onPick(l.id)} style={styles.swatchBtn}>
            <View style={[styles.swatch, { backgroundColor: l.swatch.bg }]}>
              <View style={[styles.swatchBar, { backgroundColor: l.swatch.accent }]} />
              <View style={[styles.swatchDot, { backgroundColor: l.swatch.fg }]} />
            </View>
            <Txt variant="caption" color={Colors.textSub}>
              {l.name}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function StatementView({
  worksheet,
  byQuestion,
  onEdit,
  onClose,
}: {
  worksheet: ExerciseWorksheet;
  byQuestion: Map<string, ExerciseResponse>;
  onEdit: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [shared, setShared] = useState(false);
  const segments = composeStatement(worksheet, byQuestion);

  const postToCommunity = () => {
    setShared(true);
    onClose();
    // Straight into the composer (general forum is the default channel) with
    // the statement pasted in — prefilled text also skips the rules gate.
    router.push({ pathname: '/feed/new', params: { text: statementText(segments) } });
  };

  const print = (lookId: string) => {
    const look = PRINT_LOOKS.find((l) => l.id === lookId) ?? PRINT_LOOKS[0];
    printStatement(worksheet.title, segments, look);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={24} color={Colors.textMain} />
        </Pressable>
        <Txt variant="bodySmMedium" numberOfLines={1} style={{ flex: 1 }} color={Colors.textSub}>
          {worksheet.title}
        </Txt>
        <Pressable onPress={onEdit} hitSlop={8} style={styles.editBtn}>
          <Ionicons name="create-outline" size={16} color={Colors.primary} />
          <Txt variant="caption" color={Colors.primary}>
            Edit
          </Txt>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.poster}>
          <Txt variant="titleSm" center color={Colors.primaryDark} style={styles.posterTitle}>
            {worksheet.title}
          </Txt>
          <View style={styles.posterRule} />
          {segments.map((s, i) => (
            <View key={i} style={styles.seg}>
              <Txt variant="caption" color={Colors.textSub} center style={styles.lead}>
                {s.lead}
              </Txt>
              {s.answer ? (
                <Txt variant="title" center style={styles.answer}>
                  {s.answer}
                </Txt>
              ) : null}
            </View>
          ))}
        </View>

        <PrintRow label="Print & post it on your wall" onPick={print} />
      </ScrollView>

      <View style={styles.footer}>
        {/* Sharing is standard on statement sheets (the legacy "Post to
            Community" content block is retired — its old web link confused
            more than it helped; composeStatement still excludes it if a
            sheet carries one). */}
        <Button
          title={shared ? 'Posted — nice!' : 'Post in the community'}
          variant="primary"
          iconLeft="chatbubbles-outline"
          onPress={postToCommunity}
        />
        <Button title="Done" variant="secondary" onPress={onClose} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  body: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  poster: {
    backgroundColor: '#FBF7EE',
    borderWidth: 1,
    borderColor: '#E5D9BC',
    borderRadius: Radius.md,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  posterTitle: { letterSpacing: 2, textTransform: 'uppercase' },
  posterRule: { alignSelf: 'center', width: 46, height: 2, backgroundColor: '#B98A2F' },
  seg: { gap: 2 },
  lead: { textTransform: 'uppercase', letterSpacing: 1 },
  answer: { color: Colors.textMain },
  printRow: { gap: Spacing.sm },
  printLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  swatches: { flexDirection: 'row', gap: Spacing.md },
  swatchBtn: { alignItems: 'center', gap: 4 },
  swatch: {
    width: 56,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    overflow: 'hidden',
    padding: 6,
    justifyContent: 'space-between',
  },
  swatchBar: { width: '100%', height: 5, borderRadius: 3 },
  swatchDot: { width: 16, height: 4, borderRadius: 2 },
  footer: { padding: Spacing.lg, gap: Spacing.sm },
});
