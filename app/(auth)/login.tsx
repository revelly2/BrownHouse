// ============================================================================
// Login Screen — Premium Auth UI
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
import { supabase } from "../../lib/supabase";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Enter a valid email";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Minimum 6 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setGeneralError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setGeneralError(error.message);
        Alert.alert("Login Failed", error.message);
      } else {
        router.replace("/");
      }
    } catch (err) {
      setGeneralError("An unexpected error occurred.");
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      const redirectUrl = makeRedirectUri({
        scheme: "gymreserve",
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // On web, redirect back to the current domain
          redirectTo: Platform.OS === "web" ? window.location.origin : redirectUrl,
          skipBrowserRedirect: Platform.OS !== "web", // Let WebBrowser handle it natively
        },
      });

      if (error) {
        Alert.alert("Google Login Failed", error.message);
        return;
      }

      if (Platform.OS !== "web" && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === "success" && result.url) {
          // Extract the tokens from the deep link hash fragment
          const urlParts = result.url.split("#");
          if (urlParts.length > 1) {
            const hash = urlParts[1];
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");

            if (accessToken && refreshToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) {
                Alert.alert("Session Error", sessionError.message);
              } else {
                router.replace("/");
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An unexpected error occurred.");
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
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Please enter your details to sign in
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {generalError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          )}

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
            placeholder="Enter your password"
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

          <View style={styles.forgotPasswordContainer}>
            <TouchableOpacity>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Log In"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.loginButton}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or log in with</Text>
            <View style={styles.divider} />
          </View>

          <Button
            title="Continue with Google"
            onPress={handleGoogleLogin}
            variant="outline"
            fullWidth
            size="lg"
            style={styles.googleButton}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Create Account</Text>
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
  showToggle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: "600",
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: Spacing.xl,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
  },
  loginButton: {
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
