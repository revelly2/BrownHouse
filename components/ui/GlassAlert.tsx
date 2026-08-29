import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { Colors, Spacing, Typography, Radius } from '../../constants/colors';

export interface GlassAlertAction {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface GlassAlertProps {
  visible: boolean;
  title: string;
  message: string;
  actions?: GlassAlertAction[];
  onDismiss: () => void;
}

export function GlassAlert({ visible, title, message, actions = [], onDismiss }: GlassAlertProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => {
              const isPrimary = action.style !== 'cancel' && action.style !== 'destructive' && index === 0;
              const isCancel = action.style === 'cancel';
              
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  style={[
                    styles.button,
                    isPrimary ? styles.primaryButton : null,
                    isCancel ? styles.cancelButton : null,
                  ]}
                  onPress={() => {
                    if (action.onPress) {
                      action.onPress();
                    }
                    onDismiss();
                  }}
                >
                  <Text style={[
                    styles.buttonText,
                    isPrimary ? styles.primaryButtonText : null,
                    isCancel ? styles.cancelButtonText : null,
                  ]}>
                    {action.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
            
            {actions.length === 0 && (
              <TouchableOpacity activeOpacity={0.7} style={[styles.button, styles.primaryButton]} onPress={onDismiss}>
                <Text style={[styles.buttonText, styles.primaryButtonText]}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    ...Platform.select({
      web: {
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
      },
    }),
  },
  alertBox: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
    fontWeight: '400',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryButton: {
    backgroundColor: 'rgba(0, 217, 166, 0.12)',
    borderColor: 'rgba(0, 217, 166, 0.25)',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  buttonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.light.text,
    letterSpacing: 0.3,
  },
  primaryButtonText: {
    color: Colors.primary,
  },
  cancelButtonText: {
    color: Colors.light.textTertiary,
  },
});
