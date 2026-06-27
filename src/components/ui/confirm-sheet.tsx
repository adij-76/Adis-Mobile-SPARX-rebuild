import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Bottom-sheet confirmation dialog (Figma "Have you filled the worksheet?"). */
export function ConfirmSheet({
  visible,
  title,
  cancelLabel = 'Cancel',
  confirmLabel = 'Yes, I have',
  onCancel,
  onConfirm,
}: ConfirmSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.sheet}>
        <Txt variant="title">{title}</Txt>
        <View style={styles.actions}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.btn, styles.outline, pressed && styles.pressed]}>
            <Txt variant="bodySmBold" color={Colors.primary}>
              {cancelLabel}
            </Txt>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [styles.btn, styles.outline, pressed && styles.pressed]}>
            <Txt variant="bodySmBold" color={Colors.primary}>
              {confirmLabel}
            </Txt>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  actions: { flexDirection: 'row', gap: Spacing.md },
  btn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: { borderWidth: 1, borderColor: Colors.primary },
  pressed: { opacity: 0.7 },
});
