import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WorkshopList } from '@/components/workshop-list';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

export default function LessonsScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Txt variant="title" color={Colors.white}>
            My Lessons
          </Txt>
          <Txt variant="bodySm" color={Colors.textMutedOnDark}>
            Your enrolled workshops and saved lessons
          </Txt>
        </View>
      </SafeAreaView>
      <WorkshopList />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  headerSafe: { backgroundColor: Colors.primaryDark },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
  },
});
