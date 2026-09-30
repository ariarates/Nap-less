import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFace } from "@/contexts/FaceContext";
import { useColors } from "@/hooks/useColors";

type Phase = "intro" | "camera" | "scanning" | "saving" | "done";

export default function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { registerFace } = useFace();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("intro");
  const cameraRef = useRef<CameraView>(null);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (phase === "camera") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
    if (phase === "scanning") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
      Animated.timing(progressAnim, { toValue: 1, duration: 3000, useNativeDriver: false }).start(async () => {
        setPhase("saving");
        await registerFace();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPhase("done");
      });
    }
  }, [phase]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("scanning");
    try {
      await cameraRef.current.takePictureAsync({ quality: 0.3, skipProcessing: true });
    } catch {}
  };

  const scanY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  if (phase === "done") {
    return (
      <LinearGradient colors={["#080C14", "#0D1628", "#080C14"]} style={styles.fill}>
        <Animated.View style={[styles.center, { paddingTop: insets.top + 40, opacity: fadeAnim }]}>
          <View style={[styles.successCircle, { borderColor: colors.success }]}>
            <Ionicons name="checkmark" size={56} color={colors.success} />
          </View>
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>Face Registered</Text>
          <Text style={[styles.doneSubtitle, { color: colors.mutedForeground }]}>
            Your facial identity is securely stored on this device.{"\n"}It will never be uploaded anywhere.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary, marginTop: 40 }]}
            onPress={() => router.replace("/home")}
          >
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Set Up Your Alarm</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  if (phase === "intro") {
    return (
      <LinearGradient colors={["#080C14", "#0D1628", "#080C14"]} style={styles.fill}>
        <Animated.View style={[styles.introContent, { paddingTop: insets.top + 40, opacity: fadeAnim }]}>
          <View style={[styles.iconBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="scan-outline" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.introTitle, { color: colors.foreground }]}>Register Your Face</Text>
          <Text style={[styles.introSubtitle, { color: colors.mutedForeground }]}>
            Napless uses facial recognition to confirm it's really you dismissing the alarm. Your face never leaves this device.
          </Text>
          <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <InfoRow icon="lock-closed-outline" text="Stored encrypted on-device only" colors={colors} />
            <InfoRow icon="eye-off-outline" text="Original photo is never saved" colors={colors} />
            <InfoRow icon="cloud-offline-outline" text="No cloud upload, ever" colors={colors} />
          </View>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary, marginTop: 32 }]}
            onPress={async () => {
              const perm = await requestPermission();
              if (perm.granted) setPhase("camera");
            }}
          >
            <Ionicons name="camera-outline" size={20} color={colors.primaryForeground} />
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Allow Camera & Continue</Text>
          </TouchableOpacity>
          {permission && !permission.granted && (
            <Text style={[styles.permWarn, { color: colors.accent }]}>Camera permission required to continue.</Text>
          )}
        </Animated.View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={styles.fill}>
        <CameraView ref={cameraRef} facing="front" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={["rgba(8,12,20,0.7)", "transparent", "transparent", "rgba(8,12,20,0.85)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.topOverlay, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.cameraTitle}>
            {phase === "scanning" ? "Analyzing..." : phase === "saving" ? "Saving..." : "Position your face"}
          </Text>
          <Text style={styles.cameraSubtitle}>
            {phase === "camera" ? "Center your face inside the oval" : "Please hold still"}
          </Text>
        </View>
        <View style={styles.ovalContainer}>
          <Animated.View style={[styles.ovalWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.oval, { borderColor: phase === "scanning" ? colors.success : colors.primary }]} />
            {phase === "scanning" && (
              <Animated.View
                style={[styles.scanLine, { backgroundColor: colors.primary, transform: [{ translateY: scanY }] }]}
              />
            )}
          </Animated.View>
        </View>
        {phase === "scanning" && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBg, { backgroundColor: colors.card }]}>
              <Animated.View
                style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.primary }]}
              />
            </View>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
              Mapping facial geometry...
            </Text>
          </View>
        )}
        {phase === "camera" && (
          <View style={[styles.captureContainer, { paddingBottom: insets.bottom + 32 }]}>
            <TouchableOpacity style={[styles.captureBtn, { borderColor: colors.primary }]} onPress={handleCapture}>
              <View style={[styles.captureInner, { backgroundColor: colors.primary }]} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function InfoRow({ icon, text, colors }: { icon: string; text: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as never} size={16} color={colors.success} />
      <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  introContent: { flex: 1, alignItems: "center", paddingHorizontal: 28 },
  iconBadge: { width: 88, height: 88, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 24 },
  introTitle: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 12 },
  introSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 28 },
  infoBox: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  btn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 28, alignSelf: "stretch" },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },
  permWarn: { fontSize: 13, textAlign: "center", marginTop: 12 },
  topOverlay: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", zIndex: 10, paddingHorizontal: 20 },
  cameraTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", marginBottom: 6 },
  cameraSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", textAlign: "center" },
  ovalContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  ovalWrapper: { width: 220, height: 280, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  oval: { position: "absolute", width: 220, height: 280, borderRadius: 110, borderWidth: 2.5 },
  scanLine: { position: "absolute", width: 200, height: 2, opacity: 0.8 },
  progressContainer: { position: "absolute", bottom: 120, left: 40, right: 40, alignItems: "center", gap: 10 },
  progressBg: { width: "100%", height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  captureContainer: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center" },
  captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  captureInner: { width: 60, height: 60, borderRadius: 30 },
  successCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  doneTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 12, textAlign: "center" },
  doneSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
});
