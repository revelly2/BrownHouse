// ============================================================================
// EquipmentDetailsModal — Apple-Style Frosted Details Sheet
// Displays high-fidelity equipment specifications, instructions & safety
// ============================================================================

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from "react-native";
import { Equipment } from "../../lib/types";
import { parseEquipmentDetails } from "../../lib/equipment-utils";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { X, AlertTriangle } from "lucide-react-native";

interface EquipmentDetailsModalProps {
  visible: boolean;
  equipment: (Equipment & { _activeUntil?: string | null }) | null;
  onClose: () => void;
  onReserve?: (equipment: Equipment) => void;
  onEdit?: (equipment: Equipment) => void;
  isAdmin?: boolean;
}

export function EquipmentDetailsModal({
  visible,
  equipment,
  onClose,
  onReserve,
  onEdit,
  isAdmin = false,
}: EquipmentDetailsModalProps) {
  if (!equipment) return null;

  const details = parseEquipmentDetails(equipment);
  const isMaintenance = equipment.status === "maintenance";
  const isOccupied = equipment.status === "occupied";
  const canReserve = !isMaintenance;

  const statusLabel = isOccupied
    ? equipment._activeUntil
      ? `In Use (Until ${equipment._activeUntil})`
      : "In Use Now"
    : equipment.status === "available"
    ? "Available Now"
    : "Maintenance";

  const statusColor = isMaintenance
    ? Colors.warning
    : isOccupied
    ? Colors.error
    : Colors.success;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <View style={styles.headerStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {equipment.name}
              </Text>
              <Text style={styles.brandSubtitle}>
                {equipment.brand || "Brand"} {equipment.model_number ? `· ${equipment.model_number}` : ""}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.65}
            >
              <X size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Image Preview Banner if available, or athletic graphic banner */}
            {details.image_url ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: details.image_url }}
                  style={styles.equipmentImage}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay} />
              </View>
            ) : (
              <View style={styles.fallbackBanner}>
                <View style={styles.fallbackIconWrap}>
                  <Icon
                    name={equipment.type === "cardio" ? "running-2" : "dumbbells"}
                    size={28}
                    color={Colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fallbackBannerTitle}>{equipment.name}</Text>
                  <Text style={styles.fallbackBannerSub}>
                    {equipment.type === "cardio" ? "Cardiovascular Endurance" : "Strength & Hypertrophy"}
                  </Text>
                </View>
              </View>
            )}

            {/* Tags / Badges Row */}
            <View style={styles.tagsRow}>
              <View style={styles.tagPill}>
                <Icon
                  name={equipment.type === "cardio" ? "running-2" : "dumbbells"}
                  size={14}
                  color={Colors.primary}
                />
                <Text style={styles.tagPillText}>
                  {equipment.type === "cardio" ? "Cardio" : "Strength"}
                </Text>
              </View>

              {equipment.muscle_group ? (
                <View style={styles.tagPill}>
                  <Icon name="ranking" size={14} color="#A1A1AA" />
                  <Text style={styles.tagPillText}>{equipment.muscle_group}</Text>
                </View>
              ) : null}

              {details.location ? (
                <View style={[styles.tagPill, styles.locationPill]}>
                  <Icon name="pin" size={14} color={Colors.primary} />
                  <Text style={[styles.tagPillText, { color: Colors.primary }]}>
                    {details.location}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Description / Overview */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.bodyText}>{details.summary}</Text>
            </View>

            {/* Specifications & Capacity */}
            {details.specs ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Icon name="clipboard-check" size={16} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Specifications & Capacity</Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specText}>{details.specs}</Text>
                </View>
              </View>
            ) : null}

            {/* How to Use / Instructions */}
            {details.instructions ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Icon name="notebook" size={16} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>How to Use</Text>
                </View>
                <View style={styles.instructionsBox}>
                  <Text style={styles.instructionsText}>{details.instructions}</Text>
                </View>
              </View>
            ) : null}

            {/* Safety Guidelines */}
            {details.safety_notes ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <AlertTriangle size={16} color="#F59E0B" />
                  <Text style={[styles.sectionTitle, { color: "#FBBF24" }]}>
                    Safety & Etiquette
                  </Text>
                </View>
                <View style={styles.safetyBox}>
                  <Text style={styles.safetyText}>{details.safety_notes}</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            {isAdmin && onEdit ? (
              <Button
                title="Edit Details"
                variant="outline"
                onPress={() => {
                  onClose();
                  onEdit(equipment);
                }}
                style={{ flex: 1 }}
              />
            ) : null}

            {onReserve ? (
              <Button
                title={
                  isMaintenance
                    ? "Machine Unavailable"
                    : isOccupied
                    ? "Book Future Slot"
                    : "Reserve Machine"
                }
                variant="primary"
                disabled={!canReserve}
                onPress={() => {
                  onClose();
                  onReserve(equipment);
                }}
                style={{ flex: isAdmin ? 1.5 : 1 }}
              />
            ) : (
              <Button
                title="Close"
                variant="secondary"
                onPress={onClose}
                style={{ flex: 1 }}
              />
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
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
    ...Platform.select({
      web: {
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      } as any,
    }),
  },
  card: {
    width: "100%",
    maxWidth: 540,
    maxHeight: "88%",
    backgroundColor: "rgba(22, 22, 26, 0.92)",
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderTopColor: "rgba(255, 255, 255, 0.22)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    ...Platform.select({
      web: {
        backdropFilter: "blur(28px) saturate(190%)",
        WebkitBackdropFilter: "blur(28px) saturate(190%)",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.16)",
      } as any,
    }),
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: Typography.fontFamily.sans,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: Typography.letterSpacing.tight,
    fontFamily: Typography.fontFamily.sans,
  },
  brandSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    fontFamily: Typography.fontFamily.sans,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        cursor: "pointer",
      } as any,
    }),
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  imageContainer: {
    width: "100%",
    height: 180,
    borderRadius: Radius.lg,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
  },
  equipmentImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  fallbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderTopColor: "rgba(255, 255, 255, 0.14)",
  },
  fallbackIconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackBannerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: "700",
    color: Colors.text,
    fontFamily: Typography.fontFamily.sans,
    letterSpacing: Typography.letterSpacing.tight,
  },
  fallbackBannerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontFamily: Typography.fontFamily.sans,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  locationPill: {
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderColor: "rgba(251, 191, 36, 0.22)",
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.sans,
    textTransform: "capitalize",
  },
  sectionBlock: {
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    textTransform: "uppercase",
    letterSpacing: Typography.letterSpacing.wider,
    fontFamily: Typography.fontFamily.sans,
  },
  bodyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontFamily: Typography.fontFamily.sans,
  },
  specBox: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: Spacing.md,
  },
  specText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
    fontFamily: Typography.fontFamily.sans,
  },
  instructionsBox: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: Spacing.md,
  },
  instructionsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontFamily: Typography.fontFamily.sans,
  },
  safetyBox: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.24)",
    padding: Spacing.md,
  },
  safetyText: {
    fontSize: 13,
    color: "#FDE68A",
    lineHeight: 20,
    fontFamily: Typography.fontFamily.sans,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(18, 18, 22, 0.6)",
  },
});
