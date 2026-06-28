import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

export default function WorkshopSummary() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <View style={styles.starCircle}>
            <Ionicons name="star" size={56} color={Colors.primaryDarker} />
          </View>
          <Txt variant="titleLg" color={Colors.white} center style={{ marginTop: Spacing.xl }}>
            Well done!!
          </Txt>
          <Txt
            variant="body"
            color={Colors.textMutedOnDark}
            center
            style={{ marginTop: Spacing.sm }}>
            You have successfully completed this exercise!
          </Txt>
        </View>

        <View style={styles.actions}>
          <Button
            title="Take next workshop"
            variant="secondary"
            onPress={() => router.replace('/workshop/intro')}
          />
          <Button
            title="Go Home"
            variant="secondary"
            onPress={() => router.dismissTo('/')}
          />
          <Button
            title="Watch recommended videos"
            variant="white"
            onPress={() => router.push('/videos')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryDarker },
  safe: { flex: 1, paddingHorizontal: Spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  starCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.star,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: Spacing.md, paddingBottom: Spacing.lg },
});
