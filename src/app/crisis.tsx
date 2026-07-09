import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { CRISIS_RESOURCES, type CrisisResource } from '@/lib/crisis';

/**
 * "Get help now" — an always-reachable crisis/safety surface (audit F-H3). Every
 * row opens the phone/messages app; nothing here depends on the backend.
 */
export default function Crisis() {
  const open = (href: string) => {
    Linking.openURL(href).catch(() => {});
  };
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" largeTitle="Get help now" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Ionicons name="heart-circle" size={28} color={Colors.primary} />
          <Txt variant="bodySm" color={Colors.textSub}>
            If you’re struggling or in crisis, help is available right now — free, confidential, and
            24/7. You don’t have to go through this alone.
          </Txt>
        </View>

        {CRISIS_RESOURCES.map((r) => (
          <ResourceRow key={r.name} resource={r} onPress={() => open(r.href)} />
        ))}

        <Txt variant="caption" color={Colors.textSub} style={styles.note}>
          SPARx isn’t an emergency service. In a life-threatening emergency, call 911.
        </Txt>
      </ScrollView>
    </SafeAreaView>
  );
}

function ResourceRow({ resource, onPress }: { resource: CrisisResource; onPress: () => void }) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${resource.name}. ${resource.action}`}>
      <View style={styles.cardIcon}>
        <Ionicons name={resource.icon as never} size={22} color={Colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodyMedium">{resource.name}</Txt>
        <Txt variant="caption" color={Colors.textSub}>
          {resource.detail}
        </Txt>
        <Txt variant="bodySmBold" color={Colors.primary} style={{ marginTop: 2 }}>
          {resource.action}
        </Txt>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textSub} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.md },
  intro: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(22,104,144,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { marginTop: Spacing.md, textAlign: 'center' },
});
