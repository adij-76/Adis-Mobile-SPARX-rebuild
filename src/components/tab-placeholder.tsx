import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

export type TabPlaceholderProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
};

/** On-brand placeholder for tabs not yet built out in this first pass. */
export function TabPlaceholder({ title, icon, subtitle }: TabPlaceholderProps) {
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Txt variant="title" color={Colors.white}>
            {title}
          </Txt>
        </View>
      </SafeAreaView>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={40} color={Colors.primary} />
        </View>
        <Txt variant="titleSm" center style={{ marginTop: Spacing.lg }}>
          {title} is coming soon
        </Txt>
        <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: Spacing.sm }}>
          {subtitle ?? 'This screen is part of the next build phase.'}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  headerSafe: { backgroundColor: Colors.primaryDark },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
