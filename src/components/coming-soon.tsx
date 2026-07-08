import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

/** A neutral "coming soon" panel — used to quarantine features that aren't
 *  backed by a real service yet (e.g. billing) so nothing fakes success. */
export function ComingSoon({
  title = 'Coming soon',
  message,
  icon = 'time-outline',
}: {
  title?: string;
  message?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={styles.root}>
      <View style={styles.badge}>
        <Ionicons name={icon} size={32} color={Colors.primary} />
      </View>
      <Txt variant="titleSm" color={Colors.textMain} center style={{ marginTop: Spacing.lg }}>
        {title}
      </Txt>
      {message ? (
        <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: Spacing.sm }}>
          {message}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  badge: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
