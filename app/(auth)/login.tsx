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
import { Download } from "lucide-react-native";
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

          {apkDownloadUrl && Platform.OS === 'web' && (
            <View style={{ marginTop: Spacing["3xl"], alignItems: 'center' }}>
              <Button
                title="Download Android App (APK)"
                onPress={() => window.open(apkDownloadUrl, '_blank')}
                variant="outline"
                size="md"
                leftIcon={<Download size={18} color={Colors.primary} />}
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
    ...StyleSheet.absoluteFillObject,
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
});
