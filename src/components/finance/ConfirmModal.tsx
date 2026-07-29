import { Modal, StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import { Button, Text } from '../base';

/** Confirmation dialog modal with Cancel and Confirm (danger) buttons. */
export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={[
          styles.backdrop,
          { backgroundColor: colors.overlay },
        ]}
      >
        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={[
            styles.panel,
            { backgroundColor: colors.backgroundElevated },
          ]}
        >
          <Text variant="h3">{title}</Text>

          <Text
            variant="body"
            color="secondary"
            style={styles.message}
          >
            {message}
          </Text>

          <View style={styles.actions}>
            <Button
              label="Cancel"
              onPress={onCancel}
              variant="secondary"
              style={styles.actionButton}
            />

            <Button
              label={confirmLabel}
              onPress={onConfirm}
              variant="danger"
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
  },
  message: {
    marginTop: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  actionButton: {
    flex: 1,
  },
});
