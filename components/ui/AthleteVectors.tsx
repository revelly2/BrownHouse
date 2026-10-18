// ============================================================================
// Athlete Vector Art & Illustrations
// Pure SVG vector artwork depicting athletic silhouettes, lifters, runners,
// and equipment art for dark luxury athletic aesthetics (BrownHouse Gym)
// ============================================================================

import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect, G } from "react-native-svg";
import { Colors } from "../../constants/colors";

interface VectorArtProps {
  width?: number;
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Powerful deadlifter / barbell power athlete vector silhouette with glowing energy lines
 */
export function AthleteDeadlifterVector({
  width = 240,
  height = 180,
  primaryColor = "#FBBF24",
  secondaryColor = "#E6C84F",
  opacity = 0.85,
  style,
}: VectorArtProps) {
  return (
    <View style={[{ width, height, overflow: "hidden" }, style]}>
      <Svg width={width} height={height} viewBox="0 0 240 180" fill="none">
        <Defs>
          <LinearGradient id="athleteGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity={opacity} />
            <Stop offset="100%" stopColor={secondaryColor} stopOpacity={opacity * 0.35} />
          </LinearGradient>
          <LinearGradient id="glowFloor" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity="0" />
            <Stop offset="50%" stopColor={primaryColor} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Ambient gym floor line */}
        <Path d="M10 162 H230" stroke="url(#glowFloor)" strokeWidth="3" strokeLinecap="round" />
        <Path d="M40 165 H200" stroke={primaryColor} strokeWidth="1" strokeOpacity="0.15" />

        {/* Barbell plates left */}
        <Rect x="28" y="85" width="10" height="74" rx="4" fill="url(#athleteGrad)" fillOpacity="0.25" stroke={primaryColor} strokeWidth="1.5" strokeOpacity={opacity} />
        <Rect x="41" y="92" width="8" height="60" rx="3" fill="url(#athleteGrad)" fillOpacity="0.3" stroke={primaryColor} strokeWidth="1.2" strokeOpacity={opacity} />

        {/* Barbell plates right */}
        <Rect x="191" y="92" width="8" height="60" rx="3" fill="url(#athleteGrad)" fillOpacity="0.3" stroke={primaryColor} strokeWidth="1.2" strokeOpacity={opacity} />
        <Rect x="202" y="85" width="10" height="74" rx="4" fill="url(#athleteGrad)" fillOpacity="0.25" stroke={primaryColor} strokeWidth="1.5" strokeOpacity={opacity} />

        {/* Bar shaft */}
        <Path d="M22 122 H218" stroke={primaryColor} strokeWidth="3.5" strokeLinecap="round" strokeOpacity={opacity} />

        {/* Head */}
        <Circle cx="120" cy="46" r="13" fill="url(#athleteGrad)" />

        {/* Powerful Torso & Back */}
        <Path
          d="M108 58 Q120 54 132 58 L136 88 L126 116 L114 116 L104 88 Z"
          fill="url(#athleteGrad)"
        />

        {/* Arms gripping barbell */}
        {/* Left Arm */}
        <Path
          d="M108 64 L90 88 L86 122"
          stroke={primaryColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={opacity}
        />
        {/* Right Arm */}
        <Path
          d="M132 64 L150 88 L154 122"
          stroke={primaryColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={opacity}
        />

        {/* Legs / Deep squat athletic hinge */}
        {/* Left Quad & Shin */}
        <Path
          d="M112 116 L94 136 L98 162"
          stroke={primaryColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={opacity}
        />
        {/* Right Quad & Shin */}
        <Path
          d="M128 116 L146 136 L142 162"
          stroke={primaryColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={opacity}
        />

        {/* Athletic kinetic aura rings */}
        <Circle cx="120" cy="110" r="48" stroke={primaryColor} strokeWidth="1" strokeDasharray="4 6" strokeOpacity="0.2" />
        <Circle cx="120" cy="110" r="68" stroke={primaryColor} strokeWidth="1" strokeDasharray="3 8" strokeOpacity="0.1" />
      </Svg>
    </View>
  );
}

/**
 * Sprinting athletic runner vector silhouette with forward momentum
 */
export function AthleteRunnerVector({
  width = 200,
  height = 160,
  primaryColor = "#FBBF24",
  secondaryColor = "#F59E0B",
  opacity = 0.85,
  style,
}: VectorArtProps) {
  return (
    <View style={[{ width, height, overflow: "hidden" }, style]}>
      <Svg width={width} height={height} viewBox="0 0 200 160" fill="none">
        <Defs>
          <LinearGradient id="runnerGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity={opacity} />
            <Stop offset="100%" stopColor={secondaryColor} stopOpacity={opacity * 0.4} />
          </LinearGradient>
          <LinearGradient id="speedTrails" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity="0" />
            <Stop offset="100%" stopColor={primaryColor} stopOpacity={0.3} />
          </LinearGradient>
        </Defs>

        {/* Speed trail velocity lines */}
        <Path d="M15 65 H85" stroke="url(#speedTrails)" strokeWidth="1.5" strokeDasharray="4 6" />
        <Path d="M5 95 H75" stroke="url(#speedTrails)" strokeWidth="2" strokeDasharray="6 8" />
        <Path d="M25 125 H95" stroke="url(#speedTrails)" strokeWidth="1.5" strokeDasharray="5 7" />

        {/* Head */}
        <Circle cx="132" cy="36" r="11" fill="url(#runnerGrad)" />

        {/* Torso forward lean */}
        <Path
          d="M124 45 L140 50 L118 84 L106 78 Z"
          fill="url(#runnerGrad)"
        />

        {/* Front Arm (Pumping forward) */}
        <Path
          d="M130 52 L150 64 L162 52"
          stroke={primaryColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={opacity}
        />

        {/* Back Arm (Driving backward) */}
        <Path
          d="M118 54 L98 64 L86 80"
          stroke={primaryColor}
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={opacity * 0.75}
        />

        {/* Lead Leg (Knee high drive forward) */}
        <Path
          d="M116 82 L146 96 L134 132"
          stroke={primaryColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={opacity}
        />

        {/* Trail Leg (Full extension backward) */}
        <Path
          d="M112 80 L88 104 L60 114"
          stroke={primaryColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={opacity * 0.85}
        />

        {/* Track impact spark */}
        <Circle cx="134" cy="134" r="3" fill={primaryColor} fillOpacity={0.6} />
      </Svg>
    </View>
  );
}

/**
 * Kettlebell & Heavy Iron geometric vector graphic
 */
export function KettlebellVector({
  width = 120,
  height = 120,
  primaryColor = "#FBBF24",
  opacity = 0.7,
  style,
}: VectorArtProps) {
  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} viewBox="0 0 100 100" fill="none">
        <Defs>
          <LinearGradient id="kbGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity={opacity} />
            <Stop offset="100%" stopColor={primaryColor} stopOpacity={opacity * 0.25} />
          </LinearGradient>
        </Defs>

        {/* Handle */}
        <Path
          d="M34 46 V30 C34 22 41 16 50 16 C59 16 66 22 66 30 V46"
          stroke={primaryColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeOpacity={opacity}
        />

        {/* Bell Body */}
        <Circle cx="50" cy="62" r="28" fill="url(#kbGrad)" stroke={primaryColor} strokeWidth="2" strokeOpacity={opacity} />
        {/* Flat Base */}
        <Path d="M38 88 H62" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" strokeOpacity={opacity} />
        {/* Core weight badge */}
        <Circle cx="50" cy="62" r="14" stroke={primaryColor} strokeWidth="1" strokeDasharray="3 3" strokeOpacity={0.3} />
      </Svg>
    </View>
  );
}

/**
 * Athletic Gym Machine schematic vector (Cable crossover / Functional Trainer)
 */
export function GymStationVector({
  width = 220,
  height = 160,
  primaryColor = "#FBBF24",
  opacity = 0.5,
  style,
}: VectorArtProps) {
  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} viewBox="0 0 220 160" fill="none">
        <Defs>
          <LinearGradient id="stationGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity={opacity * 0.8} />
            <Stop offset="100%" stopColor={primaryColor} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Heavy Uprights */}
        <Rect x="30" y="20" width="8" height="125" rx="2" fill="url(#stationGrad)" stroke={primaryColor} strokeWidth="1" strokeOpacity={opacity} />
        <Rect x="182" y="20" width="8" height="125" rx="2" fill="url(#stationGrad)" stroke={primaryColor} strokeWidth="1" strokeOpacity={opacity} />

        {/* Overhead bridge arch & chin-up bar */}
        <Path d="M30 32 H190" stroke={primaryColor} strokeWidth="3" strokeOpacity={opacity} />
        <Path d="M85 32 Q110 18 135 32" stroke={primaryColor} strokeWidth="2.5" strokeOpacity={opacity} />

        {/* Weight stack plates (Left) */}
        {[50, 60, 70, 80, 90, 100, 110, 120].map((y) => (
          <Rect key={`l-${y}`} x="42" y={y} width="22" height="7" rx="1.5" fill={primaryColor} fillOpacity={opacity * 0.35} />
        ))}

        {/* Weight stack plates (Right) */}
        {[50, 60, 70, 80, 90, 100, 110, 120].map((y) => (
          <Rect key={`r-${y}`} x="156" y={y} width="22" height="7" rx="1.5" fill={primaryColor} fillOpacity={opacity * 0.35} />
        ))}

        {/* Pulleys & Cable vectors */}
        <Circle cx="34" cy="38" r="5" stroke={primaryColor} strokeWidth="1.5" strokeOpacity={opacity} />
        <Circle cx="186" cy="38" r="5" stroke={primaryColor} strokeWidth="1.5" strokeOpacity={opacity} />
        <Path d="M34 43 L95 95" stroke={primaryColor} strokeWidth="1.2" strokeOpacity={opacity * 0.6} />
        <Path d="M186 43 L125 95" stroke={primaryColor} strokeWidth="1.2" strokeOpacity={opacity * 0.6} />

        {/* Handles meet in center action zone */}
        <Circle cx="95" cy="95" r="4" stroke={primaryColor} strokeWidth="1.5" strokeOpacity={opacity} />
        <Circle cx="125" cy="95" r="4" stroke={primaryColor} strokeWidth="1.5" strokeOpacity={opacity} />
      </Svg>
    </View>
  );
}
