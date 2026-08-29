// ============================================================================
// Profile Screen — Swiss Glassmorphic Design
// ============================================================================

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Image,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";

export default function ProfileScreen() {
  const { profile, user, signOut, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [form, setForm] = useState({
    first_name: profile?.first_name ?? "",
    last_name: profile?.last_name ?? "",
    phone_number: profile?.phone_number ?? "",
    height_cm: profile?.height_cm?.toString() ?? "",
    weight_kg: profile?.weight_kg?.toString() ?? "",
    target_weight_kg: profile?.target_weight_kg?.toString() ?? "",
    fitness_goal: profile?.fitness_goal ?? "",
  });

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need camera roll permission to upload a profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setUpdatingPhoto(true);
        const base64Photo = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const { error } = await updateProfile({
          profile_picture_url: base64Photo,
        });
        if (error) {
          Alert.alert("Error", "Failed to update profile picture: " + error.message);
        } else {
          Alert.alert("Success", "Profile picture updated!");
        }
      }
    } catch (error: any) {
      Alert.alert("Error", "An error occurred: " + error.message);
    } finally {
      setUpdatingPhoto(false);
    }
  };

  // Quick-update state for weight/height
  const [quickWeight, setQuickWeight] = useState(profile?.weight_kg?.toString() ?? "");
  const [quickHeight, setQuickHeight] = useState(profile?.height_cm?.toString() ?? "");
  const [quickSaving, setQuickSaving] = useState(false);

  const handleQuickUpdate = async () => {
    setQuickSaving(true);
    const updates: Record<string, number | null> = {};
    if (quickWeight) updates.weight_kg = parseFloat(quickWeight);
    if (quickHeight) updates.height_cm = parseFloat(quickHeight);

    const { error } = await updateProfile(updates);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      // Also sync the full form state
      setForm((prev) => ({
        ...prev,
        weight_kg: quickWeight,
        height_cm: quickHeight,
      }));
      if (Platform.OS === "web") {
        window.alert("Updated successfully!");
      } else {
        Alert.alert("Success", "Weight & height updated!");
      }
    }
    setQuickSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      phone_number: form.phone_number || null,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      target_weight_kg: form.target_weight_kg ? parseFloat(form.target_weight_kg) : null,
      fitness_goal: form.fitness_goal || null,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Profile updated successfully!");
      setEditing(false);
    }
    setSaving(false);
  };

  const handleSignOut = () => {
    const performSignOut = async () => {
      await signOut();
      router.replace("/");
    };

    if (Platform.OS === "web") {
      // Browsers often block window.confirm or it causes issues.
      // We will just sign out directly, or use a custom modal if needed.
      // For now, direct sign out on web to fix the bug.
      performSignOut();
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: performSignOut,
        },
      ]);
    }
  };

  const bmi =
    profile?.height_cm && profile?.weight_kg
      ? (
          profile.weight_kg / Math.pow(profile.height_cm / 100, 2)
        ).toFixed(1)
      : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Account</Text>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* Profile Card */}
      <Card variant="glassElevated" style={styles.profileCard}>
        <TouchableOpacity
          onPress={handlePickImage}
          disabled={updatingPhoto}
          style={styles.avatarContainer}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            {profile?.profile_picture_url ? (
              <Image
                source={{ uri: profile.profile_picture_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {(profile?.first_name?.[0] ?? "U").toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>Edit</Text>
          </View>
        </TouchableOpacity>
        
        <Text style={styles.profileName}>
          {profile?.first_name ?? "User"} {profile?.last_name ?? ""}
        </Text>
        <Text style={styles.profileEmail}>{user?.email ?? ""}</Text>
        
        <View style={styles.roleChip}>
          <Text style={styles.roleChipText}>{profile?.role ?? "client"}</Text>
        </View>

        {bmi && (
          <View style={styles.bmiContainer}>
            <Text style={styles.bmiLabel}>BMI</Text>
            <Text style={styles.bmiValue}>{bmi}</Text>
          </View>
        )}
      </Card>

      {/* Edit Form / Info Display */}
      <Card variant="glass" style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Personal Information</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditing(!editing)}
          >
            <Text style={styles.editBtnText}>{editing ? "Cancel" : "Edit"}</Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          <>
            <View style={styles.nameRow}>
              <Input
                label="First Name"
                value={form.first_name}
                onChangeText={(v) => setForm({ ...form, first_name: v })}
                containerStyle={styles.nameField}
              />
              <Input
                label="Last Name"
                value={form.last_name}
                onChangeText={(v) => setForm({ ...form, last_name: v })}
                containerStyle={styles.nameField}
              />
            </View>
            <Input
              label="Phone Number"
              value={form.phone_number}
              onChangeText={(v) => setForm({ ...form, phone_number: v })}
              keyboardType="phone-pad"
            />
            <View style={styles.nameRow}>
              <Input
                label="Height (cm)"
                value={form.height_cm}
                onChangeText={(v) => setForm({ ...form, height_cm: v })}
                keyboardType="numeric"
                containerStyle={styles.nameField}
              />
              <Input
                label="Weight (kg)"
                value={form.weight_kg}
                onChangeText={(v) => setForm({ ...form, weight_kg: v })}
                keyboardType="numeric"
                containerStyle={styles.nameField}
              />
              <Input
                label="Target Goal (kg)"
                value={form.target_weight_kg}
                onChangeText={(v) => setForm({ ...form, target_weight_kg: v })}
                keyboardType="numeric"
                containerStyle={styles.nameField}
              />
            </View>
            <Input
              label="Fitness Goal"
              value={form.fitness_goal}
              onChangeText={(v) => setForm({ ...form, fitness_goal: v })}
              placeholder="e.g., Lose weight, Build muscle"
              multiline
            />
            <Button
              title="Save Changes"
              variant="primary"
              size="lg"
              fullWidth
              loading={saving}
              onPress={handleSave}
              style={{ marginTop: Spacing.sm }}
            />
          </>
        ) : (
          <View style={styles.infoGrid}>
            <InfoRow label="Phone" value={profile?.phone_number ?? "Not set"} />
            <InfoRow
              label="Height"
              value={profile?.height_cm ? `${profile.height_cm} cm` : "Not set"}
            />
            <InfoRow
              label="Current Weight"
              value={profile?.weight_kg ? `${profile.weight_kg} kg` : "Not set"}
            />
            <InfoRow
              label="Target Goal"
              value={profile?.target_weight_kg ? `${profile.target_weight_kg} kg` : "Not set"}
            />
            <InfoRow
              label="Goal Description"
              value={profile?.fitness_goal ?? "Not set"}
            />
            <InfoRow
              label="Member Since"
              value={
                profile?.joined_date
                  ? new Date(profile.joined_date).toLocaleDateString()
                  : "—"
              }
              isLast
            />
          </View>
        )}
      </Card>

      {/* Quick Update — Weight & Height */}
      <Card variant="glass" style={styles.quickUpdateCard}>
        <Text style={styles.quickUpdateTitle}>Quick Update</Text>
        <Text style={styles.quickUpdateSubtitle}>
          Update your weight or height to keep your BMI accurate.
        </Text>
        <View style={styles.nameRow}>
          <Input
            label="Height (cm)"
            value={quickHeight}
            onChangeText={setQuickHeight}
            keyboardType="numeric"
            containerStyle={styles.nameField}
          />
          <Input
            label="Weight (kg)"
            value={quickWeight}
            onChangeText={setQuickWeight}
            keyboardType="numeric"
            containerStyle={styles.nameField}
          />
        </View>
        <Button
          title="Update"
          variant="primary"
          size="md"
          fullWidth
          loading={quickSaving}
          onPress={handleQuickUpdate}
        />
      </Card>

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={handleSignOut}
        activeOpacity={0.7}
      >
        <Text style={styles.signOutBtnText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value, isLast = false }: { label: string; value: string, isLast?: boolean }) {
  return (
    <View style={[infoStyles.row, isLast && infoStyles.rowLast]}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    fontWeight: "500",
  },
  value: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "500",
    color: Colors.light.text,
    textAlign: "right",
    flex: 1,
    marginLeft: Spacing.md,
    letterSpacing: 0.2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["4xl"] + 8,
    paddingBottom: 120,
    maxWidth: 1024,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: Spacing["2xl"],
  },
  headerLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: "300",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  profileCard: {
    alignItems: "center",
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  avatarText: {
    fontSize: Typography.fontSize["3xl"],
    fontWeight: "300",
    color: Colors.light.textTertiary,
  },
  editBadge: {
    position: "absolute",
    right: -8,
    bottom: -8,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  editBadgeText: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  profileName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "500",
    color: Colors.light.text,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  profileEmail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textTertiary,
    marginBottom: Spacing.md,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  roleChipText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  bmiContainer: {
    marginTop: Spacing.lg,
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "rgba(230, 200, 79, 0.08)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(230, 200, 79, 0.2)",
    gap: Spacing.sm,
  },
  bmiLabel: {
    fontSize: 11,
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  bmiValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "300",
    color: Colors.primary,
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  formTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  editBtnText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "600",
  },
  nameRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  nameField: {
    flex: 1,
  },
  infoGrid: {},
  quickUpdateCard: {
    marginBottom: Spacing.xl,
  },
  quickUpdateTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  quickUpdateSubtitle: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    marginBottom: Spacing.lg,
    lineHeight: 12 * Typography.lineHeight.normal,
  },
  signOutBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.2)",
    backgroundColor: "rgba(255, 107, 107, 0.05)",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  signOutBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.error,
    letterSpacing: 0.5,
  },
});
