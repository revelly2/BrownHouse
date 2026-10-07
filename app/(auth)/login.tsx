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
  Modal,
} from "react-native";
import { Link, router } from "expo-router";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import * as WebBrowser from "expo-web-browser";
import { Download, CheckCircle2, X, Mail } from "lucide-react-native";
import { makeRedirectUri } from "expo-auth-session";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { useWindowDimensions, ImageBackground } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loginImages, setLoginImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [apkDownloadUrl, setApkDownloadUrl] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;

  // Forgot Password State
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSendResetPassword = async () => {
    if (!resetEmail.trim()) {
      setResetError("Email address is required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(resetEmail.trim())) {
      setResetError("Please enter a valid email address.");
      return;
    }

    setResetError(null);
    setResetLoading(true);

    try {
      const redirectUrl = Platform.OS === "web"
        ? `${window.location.origin}/reset-password`
        : makeRedirectUri({
            scheme: "gymreserve",
            path: "reset-password",
          });

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setResetError(error.message);
      } else {
        setResetSent(true);
      }
    } catch (err: any) {
      setResetError(err.message || "An unexpected error occurred.");
    } finally {
      setResetLoading(false);
    }
  };

  React.useEffect(() => {
    // Fetch login image URL separately so a missing apk_download_url column won't break it
    supabase
      .from("app_settings")
      .select("login_image_url")
      .eq("id", "global")
      .single()
      .then(({ data, error }) => {
        if (!error && data?.login_image_url) {
          let urls: string[] = [];
          try {
            const parsed = JSON.parse(data.login_image_url);
            if (Array.isArray(parsed)) urls = parsed;
            else urls = [data.login_image_url];
          } catch (e) {
            urls = data.login_image_url.split(',').map((url: string) => url.trim()).filter((url: string) => url.length > 0);
          }
          if (urls.length > 0) {
            setLoginImages(urls);
          }
        }
      });

    // Fetch APK download URL safely
    supabase
      .from("app_settings")
      .select("apk_download_url")
      .eq("id", "global")
      .single()
      .then(({ data, error }) => {
        if (!error && data?.apk_download_url) {
          setApkDownloadUrl(data.apk_download_url);
        }
      });
  }, []);

  React.useEffect(() => {
    if (loginImages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % loginImages.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [loginImages]);

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

      if (Platform.OS === "web" && data?.url) {
        window.location.href = data.url;
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
      <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
        {/* LEFT COLUMN - Form */}
        <ScrollView
          contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <View style={[styles.hero, isDesktop && { alignItems: 'flex-start' }]}>
            <View style={[styles.brandWrapper, isDesktop && { alignSelf: 'flex-start' }]}>
              <View style={styles.brandAccent} />
              <Text style={styles.brandTextHuge}>
                BROWN<Text style={styles.brandTextDim}>HOUSE GYM</Text>
                <Text style={styles.brandDot}>.</Text>
              </Text>
            </View>
            <Text style={[styles.title, isDesktop && { textAlign: 'left' }]}>Log in</Text>
            <Text style={[styles.subtitle, isDesktop && { textAlign: 'left' }]}>
              Welcome back! Please enter your details.
            </Text>
          </View>

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
            <TouchableOpacity
              onPress={() => {
                setResetEmail(email.trim());
                setResetSent(false);
                setResetError(null);
                setForgotModalVisible(true);
              }}
            >
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

          {apkDownloadUrl && Platform.OS === 'web' && (
            <View style={{ marginTop: Spacing["3xl"], alignItems: 'center' }}>
              <Button
                title="Download Android App (APK)"
                onPress={() => window.open(apkDownloadUrl, '_blank')}
                variant="outline"
                size="md"
                icon={<Download size={18} color={Colors.primary} />}
                style={{ borderColor: Colors.primary }}
                textStyle={{ color: Colors.primary }}
              />
            </View>
          )}
        </View>
        </ScrollView>

        {/* RIGHT COLUMN - Image Display (Desktop Only) */}
        {isDesktop && (
          <View style={styles.rightColumn}>
            {loginImages.length > 0 ? (
              <ImageBackground
                source={{ uri: loginImages[currentImageIndex] }}
                style={styles.coverImage}
                imageStyle={{ resizeMode: 'cover' }}
              >
                <View style={styles.coverOverlay} />
              </ImageBackground>
            ) : (
              <View style={styles.fallbackCover}>
                <Image
                  source={require("../../assets/icon.png")}
                  style={{ width: 120, height: 120, opacity: 0.2 }}
                  resizeMode="contain"
                />
                <Text style={styles.fallbackCoverText}>Welcome to your new dashboard</Text>
                <Text style={styles.fallbackCoverSub}>Sign in to explore changes we've made.</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalSubtitle}>
                  {resetSent
                    ? "Check your email for instructions."
                    : "Enter your account email to receive a password reset link."}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setForgotModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {resetSent ? (
              <View style={{ alignItems: "center", paddingVertical: Spacing.lg, gap: Spacing.md }}>
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    borderWidth: 1,
                    borderColor: "rgba(16, 185, 129, 0.4)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <CheckCircle2 size={32} color={Colors.success || "#10B981"} />
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: Colors.text,
                    textAlign: "center",
                  }}
                >
                  Reset Link Sent!
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: Colors.textSecondary,
                    textAlign: "center",
                    lineHeight: 19,
                  }}
                >
                  We sent a recovery email to{"\n"}
                  <Text style={{ fontWeight: "700", color: Colors.primary }}>
                    {resetEmail}
                  </Text>
                  . Please check your inbox and spam folder.
                </Text>
                <Button
                  title="Done"
                  onPress={() => setForgotModalVisible(false)}
                  fullWidth
                  size="md"
                  style={{ marginTop: Spacing.md }}
                />
              </View>
            ) : (
              <View style={{ gap: Spacing.md, marginTop: Spacing.xs }}>
                {resetError && (
                  <View style={styles.modalErrorBanner}>
                    <Text style={styles.modalErrorText}>{resetError}</Text>
                  </View>
                )}

                <Input
                  label="Email Address"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  leftIcon={<Mail size={16} color={Colors.textSecondary} />}
                />

                <View style={styles.modalActionsRow}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setForgotModalVisible(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={resetLoading ? "Sending..." : "Send Reset Link"}
                    onPress={handleSendResetPassword}
                    loading={resetLoading}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'column',
  },
  mainLayoutDesktop: {
    flexDirection: 'row',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["3xl"],
  },
  scrollDesktop: {
    flex: 1,
    maxWidth: 600,
    width: "100%",
    alignSelf: 'center',
    paddingHorizontal: 80,
  },
  hero: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    marginTop: Spacing.xl,
  },
  brandWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing["3xl"],
    marginTop: Spacing.sm,
  },
  brandAccent: {
    width: 8,
    height: 48,
    backgroundColor: Colors.primary,
    marginRight: Spacing.lg,
    borderRadius: 4,
  },
  brandTextHuge: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFFFFF", // High contrast white for first part
    letterSpacing: -2,
    textTransform: 'uppercase',
  },
  brandTextDim: {
    color: Colors.textTertiary, // Gray for the second part
  },
  brandDot: {
    color: Colors.primary,
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
  rightColumn: {
    flex: 1,
    backgroundColor: "#5B42A4", // Default Purple brand color
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    padding: Spacing["3xl"],
  },
  coverOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  fallbackCover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing["3xl"],
  },
  fallbackCoverText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: Spacing.xl,
    textAlign: 'center',
  },
  fallbackCoverSub: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  /* --- Forgot Password Modal --- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Platform.select({
      web: {
        boxShadow: "0px 20px 40px rgba(0,0,0,0.6)",
      } as any,
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalErrorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  modalErrorText: {
    color: Colors.error || "#EF4444",
    fontSize: 12,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
});
