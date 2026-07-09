import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useStore } from '@/lib/store';

/** Manage blocked community members (audit F-M3). Blocking hides a user's posts
 *  and comments everywhere; unblocking here brings them back. */
export default function BlockedAccounts() {
  const { blockedAuthors, unblockAuthor } = useStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" largeTitle="Blocked accounts" />
      {blockedAuthors.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="shield-checkmark-outline" size={32} color={Colors.textSub} />
          <Txt variant="bodyMedium" color={Colors.textMain} center style={{ marginTop: Spacing.md }}>
            You haven't blocked anyone
          </Txt>
          <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: 4 }}>
            Blocking someone from a post hides their posts and comments from you.
          </Txt>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {blockedAuthors.map((name) => (
            <View key={name} style={styles.row}>
              <Avatar uri="" name={name} size={40} />
              <Txt variant="bodyMedium" style={{ flex: 1 }}>
                {name}
              </Txt>
              <Button
                title="Unblock"
                variant="outline"
                fullWidth={false}
                onPress={() => unblockAuthor(name)}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
});
