import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { WorkshopList } from '@/components/workshop-list';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

export default function LessonsScreen() {
  return (
    <View style={styles.root}>
      <AppHeader />
      <WorkshopList
        ListHeaderComponent={
          <View style={styles.titleWrap}>
            <Txt variant="titleLg">My Lessons</Txt>
            <Txt variant="bodySm" color={Colors.textSub}>
              Your enrolled workshops and saved lessons
            </Txt>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  titleWrap: { gap: 2, marginBottom: Spacing.md },
});
