// ============================================================================
// Register Screen — User Sign Up with Profile Data
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
import { Link, router } from "expo-router";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../lib/auth";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Enter a valid email";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Minimum 6 characters";
    if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (!agreeTerms) newErrors.terms = "You must agree to the terms";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setGeneralError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await signUp(email.trim(), password, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: "client",
      });
      
      if (error) {
        setGeneralError(error.message);
        Alert.alert("Registration Failed", error.message);
      } else {
        // Proceed to onboarding flow
        router.push("/(auth)/onboarding/step1");
      }
    } catch (err) {
      setGeneralError("An unexpected error occurred.");
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    Alert.alert("Google Sign Up", "Google Sign Up is not yet implemented.");
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
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Please enter your details to sign up
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {generalError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          )}

          <View style={styles.nameRow}>
            <Input
              label="First Name"
              placeholder="John"
              value={firstName}
              onChangeText={setFirstName}
              error={errors.firstName}
              containerStyle={styles.nameField}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              value={lastName}
              onChangeText={setLastName}
              error={errors.lastName}
              containerStyle={styles.nameField}
            />
          </View>

          <Input
            label="Email Address"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
          />

          <Input
            label="Password"
            placeholder="Min. 6 characters"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
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
            label="Confirm Password"
            placeholder="Re-enter your password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
          />

          <View style={styles.termsContainer}>
            <TouchableOpacity 
              style={[styles.checkbox, agreeTerms && styles.checkboxChecked]} 
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              {agreeTerms && <Text style={styles.checkIcon}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text>
            </Text>
          </View>
          {errors.terms && <Text style={styles.termsError}>{errors.terms}</Text>}

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            size="lg"
            variant="primary"
            style={styles.registerButton}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or sign up with</Text>
            <View style={styles.divider} />
          </View>

          <Button
            title="Continue with Google"
            onPress={handleGoogleSignUp}
            variant="outline"
            fullWidth
            size="lg"
            style={styles.googleButton}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Log In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["3xl"],
  },
  hero: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    marginTop: Spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logo: {
    width: 56,
    height: 56,
  },
  title: {
    fontSize: Typography.fontSize["3xl"],
    fontWeight: "800",
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  nameRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  nameField: {
    flex: 1,
  },
  showToggle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: "600",
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkIcon: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: "bold",
  },
  termsText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: "600",
  },
  termsError: {
    color: Colors.error,
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.md,
  },
  registerButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.sm,
  },
  googleButton: {
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing["2xl"],
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: "700",
  },
  errorBanner: {
    backgroundColor: "rgba(255, 107, 107, 0.12)",
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  errorBannerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    fontWeight: "600",
    textAlign: "center",
  },
});
