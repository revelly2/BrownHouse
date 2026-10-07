// ============================================================================
// Admin Settings — Manage Pricing, Currency, and App Configuration
// ============================================================================

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from "react-native";
import { DollarSign, Users, Sparkles, CreditCard, Trash2, Plus, Download } from "lucide-react-native";
import { ToastManager } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";

// Assuming Membership type from the db
interface Membership {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  description: string;
  is_active: boolean;
}

interface AppSettings {
  id: string;
  currency: "PHP" | "USD";
  gym_capacity: number;
  ai_features: boolean;
  login_image_url: string | null;
  apk_download_url: string | null;
}

// Local component to manage the price input state and save button
const MembershipPriceEditor = ({ 
  membership, 
  currencySymbol, 
  onSave 
}: { 
  membership: Membership; 
  currencySymbol: string; 
  onSave: (id: string, price: string) => void;
}) => {
  const [price, setPrice] = useState(membership.price.toString());

  return (
    <View style={styles.priceUpdateRow}>
      <View style={styles.priceInputWrapper}>
        <Text style={styles.currencySymbol}>{currencySymbol}</Text>
        <Input 
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          containerStyle={{ flex: 1, marginBottom: 0 }}
        />
        <Button 
          title="Save" 
          size="sm" 
          onPress={() => onSave(membership.id, price)}
          style={{ marginLeft: Spacing.md }}
        />
      </View>
    </View>
  );
};

export default function SettingsScreen() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchSettings = async () => {
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", "global")
      .single();

    if (settingsData) {
      setSettings(settingsData as AppSettings);
    } else {
      setSettings({ id: "global", currency: "PHP", gym_capacity: 50, ai_features: true, login_image_url: null, apk_download_url: null });
    }

    const { data: memData } = await supabase
      .from("memberships")
      .select("*")
      .order("price", { ascending: true });

    if (memData) setMemberships(memData as Membership[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSettings();
    setRefreshing(false);
  };

  const saveGlobalSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert(settings);

    setSavingSettings(false);
    if (error) {
      ToastManager.show("Settings Update Failed", error.message, "error");
    } else {
      ToastManager.show("Success", "Global settings updated successfully.", "success");
    }
  };

  const updateMembershipPrice = async (id: string, newPrice: string) => {
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum)) return;

    const { error } = await supabase
      .from("memberships")
      .update({ price: priceNum })
      .eq("id", id);

    if (error) {
      ToastManager.show("Failed", error.message, "error");
    } else {
      ToastManager.show("Success", "Membership price updated.", "success");
      setMemberships((prev) => prev.map((m) => (m.id === id ? { ...m, price: priceNum } : m)));
    }
  };

  const toggleMembershipStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("memberships")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      ToastManager.show("Failed", error.message, "error");
    } else {
      ToastManager.show("Success", `Membership marked as ${!currentStatus ? 'Active' : 'Inactive'}.`, "success");
      setMemberships((prev) => prev.map((m) => (m.id === id ? { ...m, is_active: !currentStatus } : m)));
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Admin</Text>
        <Text style={styles.title}>System Settings</Text>
        <Text style={styles.subtitle}>Manage global configurations and membership pricing.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Global Configuration</Text>
        <Card variant="glass" style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <DollarSign size={20} color={Colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Default Currency</Text>
              <Text style={styles.settingDesc}>Display prices in PHP or USD across the app.</Text>
            </View>
            <View style={styles.currencyToggle}>
              <TouchableOpacity 
                style={[styles.currencyBtn, settings?.currency === 'PHP' && styles.currencyBtnActive]}
                onPress={() => setSettings(s => s ? { ...s, currency: 'PHP' } : null)}
              >
                <Text style={[styles.currencyBtnText, settings?.currency === 'PHP' && styles.currencyBtnTextActive]}>PHP</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.currencyBtn, settings?.currency === 'USD' && styles.currencyBtnActive]}
                onPress={() => setSettings(s => s ? { ...s, currency: 'USD' } : null)}
              >
                <Text style={[styles.currencyBtnText, settings?.currency === 'USD' && styles.currencyBtnTextActive]}>USD</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Users size={20} color={Colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Gym Capacity Limit</Text>
              <Text style={styles.settingDesc}>Maximum number of active members allowed at once.</Text>
            </View>
            <Input 
              value={settings?.gym_capacity.toString()} 
              onChangeText={(val) => {
                const num = parseInt(val, 10);
                if (!isNaN(num)) setSettings(s => s ? { ...s, gym_capacity: num } : null);
              }}
              keyboardType="number-pad"
              containerStyle={{ width: 100, marginBottom: 0 }}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={styles.iconBox}>
              <Sparkles size={20} color={Colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>AI Workout Coach Features</Text>
              <Text style={styles.settingDesc}>Enable AI-generated workout recommendations.</Text>
            </View>
            <Switch
              value={settings?.ai_features}
              onValueChange={(val) => setSettings(s => s ? { ...s, ai_features: val } : null)}
              trackColor={{ false: "rgba(255,255,255,0.1)", true: Colors.primary }}
              thumbColor={Colors.light.background}
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Downloads</Text>
        <Card variant="glass" style={styles.card}>
          <View style={[styles.settingRow, { borderBottomWidth: 0, paddingBottom: 0, flexDirection: 'column', alignItems: 'stretch', gap: Spacing.md }]}>
            <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
              <View style={styles.iconBox}>
                <Download size={20} color={Colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Android APK Download Link</Text>
                <Text style={styles.settingDesc}>Provide a direct link to download the APK. This will show a download button on the login screen.</Text>
              </View>
            </View>
            <Input 
              placeholder="https://example.com/app.apk"
              value={settings?.apk_download_url || ""} 
              onChangeText={(val) => setSettings(s => s ? { ...s, apk_download_url: val } : null)}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
          <Button 
            title="Save URL" 
            onPress={saveGlobalSettings} 
            loading={savingSettings}
            style={{ marginTop: Spacing.xl }}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Branding</Text>
        <Card variant="glass" style={styles.card}>
          <View style={[styles.settingRow, { borderBottomWidth: 0, paddingBottom: 0, flexDirection: 'column', alignItems: 'stretch', gap: Spacing.md }]}>
            <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
              <View style={styles.iconBox}>
                <Sparkles size={20} color={Colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Login Screen Images (Shuffled)</Text>
                <Text style={styles.settingDesc}>Add multiple image URLs. A random image will be shown on the desktop login screen.</Text>
              </View>
            </View>
            
            {(() => {
              let urlsArray: string[] = [];
              if (settings?.login_image_url) {
                try {
                  const parsed = JSON.parse(settings.login_image_url);
                  if (Array.isArray(parsed)) urlsArray = parsed;
                  else urlsArray = [settings.login_image_url];
                } catch(e) {
                  // Fallback to legacy comma-separated
                  urlsArray = settings.login_image_url.split(',').map(u => u.trim()).filter(Boolean);
                }
              }

              return (
                <View style={{ gap: Spacing.sm }}>
                  {urlsArray.map((url, idx) => (
                    <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }} key={idx}>
                      <Input 
                        placeholder="https://example.com/img.jpg"
                        value={url} 
                        onChangeText={(newUrl) => {
                          const newArr = [...urlsArray];
                          newArr[idx] = newUrl;
                          setSettings(s => s ? { ...s, login_image_url: JSON.stringify(newArr) } : null);
                        }}
                        containerStyle={{ flex: 1, marginBottom: 0 }}
                      />
                      <TouchableOpacity 
                        onPress={() => {
                          const newArr = urlsArray.filter((_, i) => i !== idx);
                          setSettings(s => s ? { ...s, login_image_url: JSON.stringify(newArr) } : null);
                        }}
                        style={{ padding: 14, backgroundColor: 'rgba(255, 107, 107, 0.1)', borderRadius: Radius.md }}
                      >
                        <Trash2 size={20} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity 
                    onPress={() => {
                      const newArr = [...urlsArray, ""];
                      setSettings(s => s ? { ...s, login_image_url: JSON.stringify(newArr) } : null);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm }}
                  >
                    <Plus size={16} color={Colors.primary} />
                    <Text style={{ color: Colors.primary, fontWeight: '600' }}>Add another image</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
          
          <Button 
            title="Save Configurations" 
            onPress={saveGlobalSettings} 
            loading={savingSettings}
            style={{ marginTop: Spacing.xl }}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Membership Plans Pricing</Text>
        {memberships.map((membership) => (
          <Card key={membership.id} variant="glass" style={styles.membershipCard}>
            <View style={styles.membershipHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.iconBox}>
                  <CreditCard size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.membershipName}>{membership.name}</Text>
                  <Text style={styles.membershipDuration}>{membership.duration_days} Days Access</Text>
                </View>
              </View>
              <Switch
                value={membership.is_active}
                onValueChange={() => toggleMembershipStatus(membership.id, membership.is_active)}
                trackColor={{ false: "rgba(255,255,255,0.1)", true: Colors.success }}
                thumbColor={Colors.light.background}
              />
            </View>
            <Text style={styles.membershipDesc}>{membership.description}</Text>
            
            <MembershipPriceEditor 
              membership={membership}
              currencySymbol={settings?.currency === 'USD' ? '$' : '₱'}
              onSave={updateMembershipPrice}
            />
          </Card>
        ))}

        {memberships.length === 0 && (
          <Card variant="glass" style={{ alignItems: "center", padding: Spacing.xl }}>
            <Text style={{ color: Colors.textSecondary }}>No membership plans found in database.</Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["4xl"] + 8,
    paddingBottom: 120,
    maxWidth: 1024,
    alignSelf: "center",
    width: "100%",
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
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textTertiary,
    marginTop: 4,
    fontWeight: "500",
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  card: {
    padding: Spacing.xl,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: Spacing.lg,
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  settingInfo: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  settingTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textTertiary,
  },
  currencyToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: Radius.md,
    padding: 4,
  },
  currencyBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  currencyBtnActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  currencyBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.textTertiary,
  },
  currencyBtnTextActive: {
    color: Colors.primary,
  },
  membershipCard: {
    marginBottom: Spacing.md,
    padding: Spacing.xl,
  },
  membershipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  membershipName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "700",
    color: Colors.light.text,
  },
  membershipDuration: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  membershipDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  priceUpdateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  currencySymbol: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textSecondary,
    fontWeight: "500",
    marginRight: Spacing.sm,
  },
});
