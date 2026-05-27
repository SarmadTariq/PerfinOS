import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { Radius, Spacing } from '../../theme';
import { Button, Text } from '../base';

/** Confirmation dialog modal with Cancel and Confirm (danger) buttons. */
export const ConfirmModal = ({
  visible, title, message, confirmLabel = 'Confirm', onConfirm, onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.backdrop}>
      <View style={styles.panel} accessibilityRole="alert">
        <Text variant="h3">{title}</Text>
        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>{message}</Text>
        <View style={styles.actions}>
          <Button label="Cancel" onPress={onCancel} variant="secondary" style={{ flex: 1 }} />
          <Button label={confirmLabel} onPress={onConfirm} variant="danger" style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  panel: { width: '100%', maxWidth: 420, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', padding: Spacing.xl },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
});
