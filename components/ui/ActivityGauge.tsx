import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { ProgressChart } from "react-native-chart-kit";
import { Colors } from "../../constants/colors";

interface GaugeData {
  label: string;
  progress: number;
}

interface ActivityGaugeProps {
  title?: string;
  subtitle?: string;
  data: GaugeData[]; 
  baseColor?: string;
}

export function ActivityGaugeMd({ 
  title = "1,000", 
  subtitle = "Active users", 
  data = [],
  baseColor = Colors.primary
}: ActivityGaugeProps) {
  
  // Extract rgb for rgba
  const r = parseInt(baseColor.slice(1, 3), 16) || 106;
  const g = parseInt(baseColor.slice(3, 5), 16) || 240;
  const b = parseInt(baseColor.slice(5, 7), 16) || 182;

  const chartConfig = {
    backgroundGradientFrom: "transparent",
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: "transparent",
    backgroundGradientToOpacity: 0,
    // Chart kit uses the opacity parameter to draw inner rings lighter automatically
    color: (opacity = 1) => `rgba(${r}, ${g}, ${b}, ${opacity})`,
    strokeWidth: 14,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const chartData = {
    labels: data.map(d => d.label),
    data: data.map(d => d.progress),
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <ProgressChart
          data={chartData}
          width={Dimensions.get("window").width > 400 ? 300 : Dimensions.get("window").width - 80}
          height={240}
          strokeWidth={14}
          radius={50}
          chartConfig={chartConfig}
          hideLegend={true}
        />
        <View style={styles.centerTextContainer}>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={[styles.title, { color: baseColor }]}>{title}</Text>
        </View>
      </View>

      <View style={styles.legendContainer}>
        {data.map((item, index) => {
          // Calculate the opacity used by the chart for this ring. 
          // react-native-chart-kit formula for ProgressChart is roughly: 
          // (index + 1) / data.length or something similar. 
          // Actually, outermost is opacity 1, innermost is opacity ~0.3
          const opacity = ((index + 1) / data.length) * 0.8 + 0.2;
          return (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})` }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          );
        }).reverse()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  chartWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  centerTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});
