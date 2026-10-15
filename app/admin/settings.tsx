// ============================================================================
// Admin Settings — Manage Pricing, Currency, App Config, and Multi-AI Engine
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
  Platform,
} from "react-native";
import {
  DollarSign,
  Users,
  Sparkles,
  CreditCard,
  Trash2,
  Plus,
  Download,
  Bot,
  Cpu,
  Key,
  Check,
  Zap,
  Eye,
  EyeOff,
  Activity,
  CheckCircle2,
  AlertCircle,
} from "lucide-react-native";
import { ToastManager } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import {
  getAISettings,
  saveAISettings,
  testAIConnection,
  AISettingsConfig,
  AIProvider,
} from "../../lib/ai-service";

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
  ai_config?: any;
}

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

  // --- AI Settings State ---
  const [aiConfig, setAiConfig] = useState<AISettingsConfig>({
    provider: "gemini",
    geminiModel: "gemini-3.5-flash",
    geminiApiKey: "",
    claudeModel: "claude-3-5-haiku-20241022",
    claudeApiKey: "",
    temperature: 0.7,
    maxTokens: 2048,
    enabled: true,
  });
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);
  const [savingAi, setSavingAi] = useState(false);

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

    // Load AI configurations
    const aiData = await getAISettings();
    setAiConfig(aiData);

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

  const handleSaveAISettings = async () => {
    setSavingAi(true);
    const result = await saveAISettings(aiConfig);
    setSavingAi(false);

    if (result.success) {
      ToastManager.show("AI Settings Saved", `Active AI: ${aiConfig.provider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude'}`, "success");
    } else {
      ToastManager.show("Save Failed", result.error || "Could not save AI settings.", "error");
    }
  };

  const handleTestAI = async () => {
    setTestingAi(true);
    setAiTestResult(null);
    const result = await testAIConnection(aiConfig.provider);
    setTestingAi(false);
    setAiTestResult(result);

    if (result.success) {
      ToastManager.show("Connection Successful", `Latency: ${result.latencyMs}ms`, "success");
    } else {
      ToastManager.show("Connection Error", result.message, "error");
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
        <Text style={styles.subtitle}>Manage global configurations, AI model engines, and membership pricing.</Text>
      </View>

      {/* ========================================================================= */}
      {/* AI ENGINE & MODEL CONFIGURATION (GEMINI & CLAUDE HAIKU) */}
      {/* ========================================================================= */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
          <View>
            <Text style={styles.sectionTitle}>AI Engine & Model Configuration</Text>
            <Text style={styles.sectionSubtitle}>Configure Google Gemini 3.5 Flash and Anthropic Claude Haiku</Text>
          </View>
          <View style={styles.activeEngineBadge}>
            <Cpu size={14} color={Colors.primary} />
            <Text style={styles.activeEngineBadgeText}>
              Active: {aiConfig.provider === "gemini" ? "Gemini 3.5 Flash" : "Claude 3.5 Haiku"}
            </Text>
          </View>
        </View>

        <Card variant="glass" style={styles.card}>
          {/* Master AI Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Sparkles size={20} color={Colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>AI Workout Coach Features</Text>
              <Text style={styles.settingDesc}>Enable AI-generated workout recommendations and FITT workout plans.</Text>
            </View>
            <Switch
              value={aiConfig.enabled}
              onValueChange={(val) => {
                setAiConfig(prev => ({ ...prev, enabled: val }));
                setSettings(s => s ? { ...s, ai_features: val } : null);
              }}
              trackColor={{ false: "rgba(255,255,255,0.1)", true: Colors.primary }}
              thumbColor={Colors.light.background}
            />
          </View>

          {/* AI Provider Switch Cards */}
          <View style={{ marginBottom: Spacing.xl }}>
            <Text style={styles.fieldSectionLabel}>Select Active AI Provider</Text>
            <View style={styles.aiProviderRow}>
              {/* Option 1: Gemini */}
              <TouchableOpacity
                style={[
                  styles.aiProviderCard,
                  aiConfig.provider === "gemini" && styles.aiProviderCardActive
                ]}
                onPress={() => setAiConfig(prev => ({ ...prev, provider: "gemini" }))}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.aiLogoBox, { backgroundColor: "rgba(251, 191, 36, 0.15)" }]}>
                      <Zap size={18} color={Colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.aiProviderName}>Google Gemini</Text>
                      <Text style={styles.aiProviderSub}>Fast & multimodal</Text>
                    </View>
                  </View>
                  {aiConfig.provider === "gemini" && (
                    <View style={styles.selectedCheck}>
                      <Check size={14} color={Colors.primaryDark} />
                    </View>
                  )}
                </View>
                <View style={styles.aiModelTag}>
                  <Text style={styles.aiModelTagText}>Model: {aiConfig.geminiModel}</Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Claude Haiku */}
              <TouchableOpacity
                style={[
                  styles.aiProviderCard,
                  aiConfig.provider === "claude" && styles.aiProviderCardActive
                ]}
                onPress={() => setAiConfig(prev => ({ ...prev, provider: "claude" }))}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.aiLogoBox, { backgroundColor: "rgba(217, 119, 6, 0.2)" }]}>
                      <Bot size={18} color="#F59E0B" />
                    </View>
                    <View>
                      <Text style={styles.aiProviderName}>Claude Haiku</Text>
                      <Text style={styles.aiProviderSub}>Anthropic AI engine</Text>
                    </View>
                  </View>
                  {aiConfig.provider === "claude" && (
                    <View style={styles.selectedCheck}>
                      <Check size={14} color={Colors.primaryDark} />
                    </View>
                  )}
                </View>
                <View style={styles.aiModelTag}>
                  <Text style={styles.aiModelTagText}>Model: {aiConfig.claudeModel}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Model Selection Specifics */}
          <View style={{ gap: Spacing.lg }}>
            {aiConfig.provider === "gemini" ? (
              <View style={styles.providerConfigBox}>
                <Text style={styles.configBoxTitle}>⚡ Google Gemini Configuration</Text>
                
                {/* Gemini Model */}
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.inputLabel}>Gemini Model</Text>
                  <View style={styles.chipRow}>
                    {["gemini-3.5-flash", "gemini-3.8-flash", "gemini-2.5-flash"].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.modelChip, aiConfig.geminiModel === m && styles.modelChipActive]}
                        onPress={() => setAiConfig(prev => ({ ...prev, geminiModel: m }))}
                      >
                        <Text style={[styles.modelChipText, aiConfig.geminiModel === m && styles.modelChipTextActive]}>
                          {m} {m === "gemini-3.5-flash" ? "(Recommended)" : ""}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Gemini API Key */}
                <View style={{ marginTop: Spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.inputLabel}>Google Gemini API Key</Text>
                    <TouchableOpacity onPress={() => setShowGeminiKey(!showGeminiKey)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {showGeminiKey ? <EyeOff size={14} color={Colors.textTertiary} /> : <Eye size={14} color={Colors.textTertiary} />}
                      <Text style={{ fontSize: 11, color: Colors.textTertiary }}>{showGeminiKey ? "Hide" : "Reveal"}</Text>
                    </TouchableOpacity>
                  </View>
                  <Input
                    placeholder="AQ.Ab8RN..."
                    value={aiConfig.geminiApiKey}
                    onChangeText={(val) => setAiConfig(prev => ({ ...prev, geminiApiKey: val }))}
                    secureTextEntry={!showGeminiKey}
                    containerStyle={{ marginBottom: 0 }}
                  />
                  <Text style={styles.keyHint}>Key from Google AI Studio. Already populated from .env if present.</Text>
                </View>
              </View>
            ) : (
              <View style={styles.providerConfigBox}>
                <Text style={styles.configBoxTitle}>🧠 Anthropic Claude Haiku Configuration</Text>
                
                {/* Claude Model */}
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.inputLabel}>Claude Haiku Model</Text>
                  <View style={styles.chipRow}>
                    {["claude-3-5-haiku-20241022", "claude-3-haiku-20240307"].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.modelChip, aiConfig.claudeModel === m && styles.modelChipActive]}
                        onPress={() => setAiConfig(prev => ({ ...prev, claudeModel: m }))}
                      >
                        <Text style={[styles.modelChipText, aiConfig.claudeModel === m && styles.modelChipTextActive]}>
                          {m === "claude-3-5-haiku-20241022" ? "Claude 3.5 Haiku (Latest)" : "Claude 3 Haiku"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Claude API Key */}
                <View style={{ marginTop: Spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.inputLabel}>Anthropic API Key</Text>
                    <TouchableOpacity onPress={() => setShowClaudeKey(!showClaudeKey)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {showClaudeKey ? <EyeOff size={14} color={Colors.textTertiary} /> : <Eye size={14} color={Colors.textTertiary} />}
                      <Text style={{ fontSize: 11, color: Colors.textTertiary }}>{showClaudeKey ? "Hide" : "Reveal"}</Text>
                    </TouchableOpacity>
                  </View>
                  <Input
                    placeholder="sk-ant-api03-..."
                    value={aiConfig.claudeApiKey}
                    onChangeText={(val) => setAiConfig(prev => ({ ...prev, claudeApiKey: val }))}
                    secureTextEntry={!showClaudeKey}
                    containerStyle={{ marginBottom: 0 }}
                  />
                  <Text style={styles.keyHint}>Key from console.anthropic.com. Enables Claude Haiku plan generation.</Text>
                </View>
              </View>
            )}

            {/* Temperature Preset */}
            <View>
              <Text style={styles.inputLabel}>Creativity & Temperature</Text>
              <View style={styles.chipRow}>
                {[
                  { val: 0.2, label: "0.2 — Strict & Deterministic" },
                  { val: 0.7, label: "0.7 — Balanced (Recommended)" },
                  { val: 1.0, label: "1.0 — High Variety" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.val}
                    style={[styles.modelChip, aiConfig.temperature === item.val && styles.modelChipActive]}
                    onPress={() => setAiConfig(prev => ({ ...prev, temperature: item.val }))}
                  >
                    <Text style={[styles.modelChipText, aiConfig.temperature === item.val && styles.modelChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Test Connection Banner / Feedback */}
            {aiTestResult && (
              <View style={[
                styles.testResultBanner, 
                aiTestResult.success ? styles.testResultSuccess : styles.testResultError
              ]}>
                {aiTestResult.success ? (
                  <CheckCircle2 size={16} color={Colors.success} />
                ) : (
                  <AlertCircle size={16} color={Colors.error} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.testResultTitle, aiTestResult.success ? { color: Colors.success } : { color: Colors.error }]}>
                    {aiTestResult.success ? `Connected in ${aiTestResult.latencyMs}ms!` : "Connection Failed"}
                  </Text>
                  <Text style={styles.testResultDesc}>{aiTestResult.message}</Text>
                </View>
              </View>
            )}

            {/* AI Action Buttons */}
            <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm }}>
              <Button
                title={testingAi ? "Testing Connection..." : `Test ${aiConfig.provider === 'gemini' ? 'Gemini' : 'Claude'} Connection`}
                variant="outline"
                onPress={handleTestAI}
                disabled={testingAi}
                style={{ flex: 1 }}
              />
              <Button
                title={savingAi ? "Saving..." : "Save AI Configurations"}
                variant="primary"
                onPress={handleSaveAISettings}
                disabled={savingAi}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </Card>
      </View>

      {/* ========================================================================= */}
      {/* GLOBAL CONFIGURATION */}
      {/* ========================================================================= */}
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

          <View style={[styles.settingRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
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

          <Button 
            title="Save Global Settings" 
            onPress={saveGlobalSettings} 
            loading={savingSettings}
            style={{ marginTop: Spacing.xl }}
          />
        </Card>
      </View>

      {/* ========================================================================= */}
      {/* APP DOWNLOADS */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* BRANDING */}
      {/* ========================================================================= */}
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
            title="Save Images" 
            onPress={saveGlobalSettings} 
            loading={savingSettings}
            style={{ marginTop: Spacing.xl }}
          />
        </Card>
      </View>

      {/* ========================================================================= */}
      {/* MEMBERSHIP PRICING */}
      {/* ========================================================================= */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Membership Pricing</Text>
        {memberships.map((membership) => (
          <Card key={membership.id} variant="glass" style={styles.membershipCard}>
            <View style={styles.membershipHeader}>
              <View>
                <Text style={styles.membershipName}>{membership.name}</Text>
                <Text style={styles.membershipDuration}>{membership.duration_days} Days Access</Text>
              </View>
              <Switch
                value={membership.is_active}
                onValueChange={() => toggleMembershipStatus(membership.id, membership.is_active)}
                trackColor={{ false: "rgba(255,255,255,0.1)", true: Colors.primary }}
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
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  activeEngineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  activeEngineBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
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
  fieldSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  aiProviderRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  aiProviderCard: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  aiProviderCardActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(251, 191, 36, 0.08)",
  },
  aiLogoBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  aiProviderName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
  },
  aiProviderSub: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  selectedCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  aiModelTag: {
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    alignSelf: "flex-start",
  },
  aiModelTagText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
  providerConfigBox: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  configBoxTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.text,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  keyHint: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modelChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modelChipActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
  },
  modelChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  modelChipTextActive: {
    color: Colors.primary,
  },
  testResultBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  testResultSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  testResultError: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  testResultTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  testResultDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
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
