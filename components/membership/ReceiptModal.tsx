// ============================================================================
// Official Membership Receipt Modal — Printable & Downloadable
// ============================================================================

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";

export interface MembershipReceiptData {
  paymentId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  planName: string;
  durationDays?: number;
  startDate?: string;
  endDate?: string;
  adminName?: string;
  currencySymbol?: string;
}

interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  data: MembershipReceiptData | null;
}

export function ReceiptModal({ visible, onClose, data }: ReceiptModalProps) {
  if (!data) return null;

  const currency = data.currencySymbol || "₱";
  const receiptNo = `RCP-${data.paymentId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const formattedDate = new Date(data.paymentDate).toLocaleString();

  const handlePrint = () => {
    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank", "width=420,height=650");
      if (printWindow) {
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Receipt ${receiptNo}</title>
              <style>
                * { box-sizing: border-box; }
                body {
                  font-family: 'Courier New', Courier, monospace;
                  padding: 24px 16px;
                  width: 320px;
                  margin: 0 auto;
                  color: #111;
                  background: #fff;
                  font-size: 13px;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .gym-name { font-size: 18px; font-weight: 900; letter-spacing: 1px; margin: 0; }
                .gym-sub { font-size: 11px; margin: 4px 0 12px; color: #555; }
                .divider { border-top: 1px dashed #777; margin: 12px 0; }
                .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
                .row-label { color: #555; }
                .row-value { font-weight: 600; text-align: right; }
                .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; margin-top: 8px; }
                .footer { text-align: center; font-size: 11px; color: #666; margin-top: 20px; line-height: 1.4; }
                .badge { border: 1px solid #111; padding: 2px 8px; border-radius: 4px; display: inline-block; font-size: 11px; font-weight: bold; }
                @media print {
                  body { width: 100%; padding: 0; margin: 0; }
                  @page { margin: 8mm; size: auto; }
                }
              </style>
            </head>
            <body>
              <div class="text-center">
                <h1 class="gym-name">BROWNHOUSE GYM</h1>
                <div class="gym-sub">OFFICIAL MEMBERSHIP RECEIPT</div>
                <div class="badge">PAID / COMPLETED</div>
              </div>

              <div class="divider"></div>

              <div class="row">
                <span class="row-label">Receipt No:</span>
                <span class="row-value">${receiptNo}</span>
              </div>
              <div class="row">
                <span class="row-label">Date & Time:</span>
                <span class="row-value">${formattedDate}</span>
              </div>
              <div class="row">
                <span class="row-label">Issued By:</span>
                <span class="row-value">${data.adminName || "Administrator"}</span>
              </div>

              <div class="divider"></div>

              <div class="row">
                <span class="row-label">Member:</span>
                <span class="row-value">${data.clientName}</span>
              </div>
              ${data.clientEmail ? `
              <div class="row">
                <span class="row-label">Email:</span>
                <span class="row-value">${data.clientEmail}</span>
              </div>` : ""}
              ${data.clientPhone ? `
              <div class="row">
                <span class="row-label">Phone:</span>
                <span class="row-value">${data.clientPhone}</span>
              </div>` : ""}

              <div class="divider"></div>

              <div class="row">
                <span class="row-label">Plan:</span>
                <span class="row-value">${data.planName}</span>
              </div>
              ${data.durationDays ? `
              <div class="row">
                <span class="row-label">Duration:</span>
                <span class="row-value">${data.durationDays} Days</span>
              </div>` : ""}
              ${data.startDate && data.endDate ? `
              <div class="row">
                <span class="row-label">Validity:</span>
                <span class="row-value">${new Date(data.startDate).toLocaleDateString()} — ${new Date(data.endDate).toLocaleDateString()}</span>
              </div>` : ""}
              <div class="row">
                <span class="row-label">Payment Method:</span>
                <span class="row-value" style="text-transform: capitalize;">${data.paymentMethod}</span>
              </div>

              <div class="divider"></div>

              <div class="total-row">
                <span>TOTAL AMOUNT:</span>
                <span>${currency}${Number(data.amount).toFixed(2)}</span>
              </div>

              <div class="divider"></div>

              <div class="footer">
                Thank you for training with BrownHouse Gym!<br/>
                Please keep this receipt as proof of membership.<br/>
                Stay focused. Stay strong.
              </div>
            </body>
          </html>
        `;
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Paper Receipt Card */}
            <View style={styles.receiptPaper}>
              {/* Receipt Header */}
              <View style={styles.receiptHeader}>
                <Text style={styles.gymTitle}>BROWNHOUSE GYM</Text>
                <Text style={styles.receiptSubtitle}>OFFICIAL MEMBERSHIP RECEIPT</Text>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>✓ PAID & CONFIRMED</Text>
                </View>
              </View>

              <View style={styles.dashedDivider} />

              {/* Transaction Meta */}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Receipt #:</Text>
                <Text style={styles.metaValueMono}>{receiptNo}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date:</Text>
                <Text style={styles.metaValue}>{formattedDate}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Processed By:</Text>
                <Text style={styles.metaValue}>{data.adminName || "Administrator"}</Text>
              </View>

              <View style={styles.dashedDivider} />

              {/* Member Info */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>MEMBER DETAILS</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Name:</Text>
                <Text style={styles.metaValueBold}>{data.clientName}</Text>
              </View>
              {data.clientEmail ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Email:</Text>
                  <Text style={styles.metaValue}>{data.clientEmail}</Text>
                </View>
              ) : null}
              {data.clientPhone ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Phone:</Text>
                  <Text style={styles.metaValue}>{data.clientPhone}</Text>
                </View>
              ) : null}

              <View style={styles.dashedDivider} />

              {/* Membership Plan Info */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>MEMBERSHIP SUBSCRIPTION</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Plan:</Text>
                <Text style={styles.metaValueBold}>{data.planName}</Text>
              </View>
              {data.durationDays ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Duration:</Text>
                  <Text style={styles.metaValue}>{data.durationDays} Days Access</Text>
                </View>
              ) : null}
              {data.startDate && data.endDate ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Validity Period:</Text>
                  <Text style={styles.metaValue}>
                    {new Date(data.startDate).toLocaleDateString()} — {new Date(data.endDate).toLocaleDateString()}
                  </Text>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Payment Method:</Text>
                <Text style={[styles.metaValue, { textTransform: "capitalize" }]}>
                  {data.paymentMethod}
                </Text>
              </View>

              <View style={styles.dashedDivider} />

              {/* Total Row */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL PAID</Text>
                <Text style={styles.totalValue}>
                  {currency}{Number(data.amount).toFixed(2)}
                </Text>
              </View>

              <View style={styles.dashedDivider} />

              <View style={styles.receiptFooter}>
                <Text style={styles.footerNote}>
                  Keep this official receipt as proof of your active gym membership.
                </Text>
                <Text style={styles.footerMotto}>
                  BrownHouse Gym • Train Hard, Stay Strong
                </Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.actionRow}>
              {Platform.OS === "web" && (
                <Button
                  title="Print Receipt"
                  onPress={handlePrint}
                  style={styles.printBtn}
                />
              )}
              <Button
                title="Close"
                variant="outline"
                onPress={onClose}
                style={styles.closeBtn}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "90%",
    backgroundColor: "rgba(18, 18, 22, 0.95)",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: Spacing.lg,
  },
  scrollContent: {
    alignItems: "center",
  },
  receiptPaper: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  receiptHeader: {
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  gymTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: 1.5,
  },
  receiptSubtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 1,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  paidBadge: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  paidBadgeText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dashedDivider: {
    width: "100%",
    borderStyle: "dashed",
    borderBottomWidth: 1,
    borderBottomColor: "#9CA3AF",
    marginVertical: Spacing.sm + 2,
  },
  sectionHeader: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 2,
  },
  metaLabel: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  metaValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "500",
  },
  metaValueBold: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },
  metaValueMono: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#111827",
    fontWeight: "700",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: Typography.fontSize.md,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: "900",
    color: "#059669",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  receiptFooter: {
    alignItems: "center",
    marginTop: 4,
  },
  footerNote: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 14,
  },
  footerMotto: {
    fontSize: 9,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
    width: "100%",
  },
  printBtn: {
    flex: 1,
  },
  closeBtn: {
    flex: 1,
  },
});
