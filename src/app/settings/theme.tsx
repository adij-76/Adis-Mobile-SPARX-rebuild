import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

const OPTIONS = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'system', label: 'System default', icon: 'phone-portrait-outline' },
] as const;

export default function ThemeSetting() {
  const [value, setValue] = useState<string>('light');
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Theme" />
      <View style={styles.body}>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {OPTIONS.map((o, i) => (
            <Pressable
              key={o.key}
              onPress={() => setValue(o.key)}
              style={[styles.row, i < OPTIONS.length - 1 && styles.divider]}>
              <Ionicons name={o.icon} size={22} color={Colors.primary} />
              <Txt variant="bodyMedium" style={{ flex: 1 }}>
                {o.label}
              </Txt>
              <Ionicons
                name={value === o.key ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={value === o.key ? Colors.primary : Colors.strokeStrong}
              />
            </Pressable>
          ))}
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: Colors.stroke },
});
