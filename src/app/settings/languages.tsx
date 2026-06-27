import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

const LANGS = ['English', 'Español', 'Français', 'Deutsch', 'Português', 'العربية', '中文', '日本語'];

export default function Languages() {
  const [value, setValue] = useState('English');
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Language" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {LANGS.map((l, i) => (
            <Pressable
              key={l}
              onPress={() => setValue(l)}
              style={[styles.row, i < LANGS.length - 1 && styles.divider]}>
              <Txt variant="bodyMedium" style={{ flex: 1 }}>
                {l}
              </Txt>
              {value === l && <Ionicons name="checkmark" size={22} color={Colors.primary} />}
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: Colors.stroke },
});
