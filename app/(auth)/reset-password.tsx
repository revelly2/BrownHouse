// ============================================================================
// Reset Password Screen — Set New Password after Email Recovery
// ============================================================================

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabase";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { CheckCircle2, Lock } from "lucide-react-native";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 6) {
      errs.password = "Minimum 6 characters";
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpdatePassword = async () => {
    setGeneralError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setGeneralError(error.message);
        Alert.alert("Update Failed", error.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setGeneralError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              {success ? (
                <CheckCircle2 size={36} color={Colors.success || "#10B981"} />
              ) : (
                <Lock size={32} color={Colors.primary} />
              )}
            </View>
            <Text style={styles.title}>
              {success ? "Password Updated!" : "Set New Password"}
            </Text>
            <Text style={styles.subtitle}>
              {success
                ? "Your password has been changed successfully. You can now log in with your new credentials."
                : "Please enter and confirm your new password below."}
            </Text>
          </View>

          {/* Success View */}
          {success ? (
            <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
              <Button
                title="Back to Login"
                onPress={() => router.replace("/(auth)/login")}
                size="lg"
                fullWidth
              />
            </View>
          ) : (
            /* Form View */
            <View style={styles.form}>
              {generalError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{generalError}</Text>
                </View>
              )}

              <Input
                label="New Password"
                placeholder="Enter new password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                rightIcon={
                  <Text style={styles.showToggle}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                }
                onRightIconPress={() => setShowPassword(!showPassword)}
              />

              <Input
                label="Confirm New Password"
                placeholder="Repeat new password"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
              />

              <Button
                title="Update Password"
                onPress={handleUpdatePassword}
                loading={loading}
                size="lg"
                fullWidth
                style={{ marginTop: Spacing.sm }}
              />

              <TouchableOpacity
                onPress={() => router.replace("/(auth)/login")}
                style={{ alignItems: "center", marginTop: Spacing.md }}
              >
                <Text style={styles.cancelText}>Cancel and return to login</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing["2xl"],
    ...Platform.select({
      web: {
        boxShadow: "0px 20px 40px rgba(0,0,0,0.6)",
      } as any,
    }),
  },
  hero: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  form: {
    gap: Spacing.md,
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  errorBannerText: {
    color: Colors.error || "#EF4444",
    fontSize: 13,
  },
  showToggle: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
