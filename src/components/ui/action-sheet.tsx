import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export type SheetAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
};

/** Bottom action sheet (•••-style options menu). */
export function ActionSheet({
  visible,
  onClose,
  actions,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  actions: SheetAction[];
  title?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetWrap} onPress={(e) => e.stopPropagation?.()}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.sheet}>
              {title ? (
                <Txt variant="caption" color={Colors.textSub} center style={styles.title}>
                  {title}
                </Txt>
              ) : null}
              {actions.map((a, i) => (
                <Pressable
                  key={a.label}
                  style={[styles.row, i < actions.length - 1 && styles.rowDivider]}
                  onPress={() => {
                    onClose();
                    a.onPress();
                  }}>
                  <Ionicons
                    name={a.icon}
                    size={20}
                    color={a.destructive ? Colors.danger : Colors.textMain}
                  />
                  <Txt variant="bodyMedium" color={a.destructive ? Colors.danger : Colors.textMain}>
                    {a.label}
                  </Txt>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.cancel} onPress={onClose}>
              <Txt variant="bodyMedium" color={Colors.primary}>
                Cancel
              </Txt>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetWrap: { padding: Spacing.md, gap: Spacing.sm },
  sheet: { backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden' },
  title: { paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.stroke },
  cancel: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
