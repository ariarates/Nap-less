import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CHALLENGES, useAlarm } from "@/contexts/AlarmContext";
import { useFace } from "@/contexts/FaceContext";
import { useColors } from "@/hooks/useColors";

type Phase = "countdown" | "camera" | "verifying" | "success" | "fail";

const COUNTDOWN_SECS = 5;

export default function ChallengeScreen() {
  useKeepAwake();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { config, stopAlarm, getChallenge } = useAlarm();
  const { verifyFace } = useFace();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [attempt, setAttempt] = useState(0);
  const [verifyStep, setVerifyStep] = useState<"face" | "action" | null>(null);

  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const challenge = getChallenge();

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
      return () => sub.remove();
    }
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return;
    Animated.timing(progressAnim, { toValue: 0, duration: COUNTDOWN_SECS * 1000, useNativeDriver: false }).start();
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          requestPermission().then(() => setPhase("camera"));
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("verifying");

    try {
      await cameraRef.current.takePictureAsync({ quality: 0.4, skipProcessing: true });
    } catch {}

    setVerifyStep("face");
    await delay(1500);
    const faceOk = await verifyFace();

    if (!faceOk) {
      setVerifyStep(null);
      setPhase("fail");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 14, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -14, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      return;
    }

    setVerifyStep("action");
    await delay(1800);

    setVerifyStep(null);
    setPhase("success");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 6 }).start();

    await delay(1800);
    stopAlarm();
    router.replace("/home");
  };

  const handleRetry = () => {
    setAttempt((a) => a + 1);
    setPhase("countdown");
    setCountdown(COUNTDOWN_SECS);
    progressAnim.setValue(1);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const challengeText = challenge?.id === "custom" ? config?.customChallenge ?? challenge.description : challenge?.description ?? "";

  if (phase === "countdown") {
    return (
      <LinearGradient colors={["#080C14", "#0D1628", "#080C14"]} style={styles.fill}>
        <Animated.View
          style={[styles.center, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40), opacity: fadeAnim }]}
        >
          <View style={[styles.iconBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={challenge?.icon ?? "camera-outline"} size={36} color={colors.accent} />
          </View>

          <Text style={[styles.challengeTitle, { color: colors.foreground }]}>Your Challenge</Text>
          <Text style={[styles.challengeDesc, { color: colors.mutedForeground }]}>{challengeText}</Text>

          {attempt > 0 && (
            <View style={[styles.attemptBadge, { backgroundColor: colors.accent + "20", borderColor: colors.accent + "40" }]}>
              <Ionicons name="warning-outline" size={14} color={colors.accent} />
              <Text style={[styles.attemptText, { color: colors.accent }]}>Attempt {attempt + 1} — Try again</Text>
            </View>
          )}

          <View style={styles.countdownSection}>
            <Text style={[styles.countdownNum, { color: colors.primary }]}>{countdown}</Text>
            <Text style={[styles.countdownLabel, { color: colors.mutedForeground }]}>Camera opens in</Text>
          </View>

          <View style={styles.progressBarOuter}>
            <View style={[styles.progressBarBg, { backgroundColor: colors.card }]}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth, backgroundColor: colors.primary }]} />
            </View>
          </View>
        </Animated.View>
      </LinearGradient>
    );
  }

  if (phase === "camera" || phase === "verifying") {
    return (
      <View style={styles.fill}>
        {permission?.granted ? (
          <CameraView ref={cameraRef} facing="front" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]} />
        )}
        <LinearGradient
          colors={["rgba(8,12,20,0.75)", "transparent", "rgba(8,12,20,0.9)"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.cameraTop, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20) }]}>
          <View style={[styles.challengeChip, { backgroundColor: "rgba(8,12,20,0.8)", borderColor: colors.border }]}>
            <Ionicons name={challenge?.icon ?? "camera-outline"} size={14} color={colors.accent} />
            <Text style={[styles.chipText, { color: colors.foreground }]} numberOfLines={1}>
              {challengeText}
            </Text>
          </View>
        </View>

        {phase === "verifying" ? (
          <View style={styles.verifyingOverlay}>
            <View style={[styles.verifyCard, { backgroundColor: "rgba(8,12,20,0.92)", borderColor: colors.border }]}>
              <VerifyRow label="Face recognition" status={verifyStep === "face" ? "loading" : verifyStep === "action" ? "ok" : "idle"} colors={colors} />
              <VerifyRow label="Challenge detection" status={verifyStep === "action" ? "loading" : "idle"} colors={colors} />
            </View>
          </View>
        ) : (
          <View style={[styles.cameraBottom, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 28) }]}>
            <TouchableOpacity
              style={[styles.captureBtn, { borderColor: colors.accent }]}
              onPress={handleCapture}
            >
              <View style={[styles.captureInner, { backgroundColor: colors.accent }]} />
            </TouchableOpacity>
            <Text style={styles.captureHint}>Tap to take your challenge photo</Text>
          </View>
        )}
      </View>
    );
  }

  if (phase === "success") {
    return (
      <LinearGradient colors={["#030D0A", "#051A10", "#030D0A"]} style={styles.fill}>
        <Animated.View style={[styles.center, { transform: [{ scale: successAnim }] }]}>
          <View style={[styles.successRing, { borderColor: colors.success }]}>
            <Ionicons name="checkmark" size={64} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Challenge Complete!</Text>
          <Text style={[styles.successSub, { color: colors.mutedForeground }]}>Alarm dismissed. Have a great day!</Text>
        </Animated.View>
      </LinearGradient>
    );
  }

  if (phase === "fail") {
    return (
      <LinearGradient colors={["#1A0505", "#200808", "#0A0000"]} style={styles.fill}>
        <Animated.View style={[styles.center, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={[styles.failRing, { borderColor: colors.accent }]}>
            <Ionicons name="close" size={64} color={colors.accent} />
          </View>
          <Text style={[styles.failTitle, { color: colors.foreground }]}>Verification Failed</Text>
          <Text style={[styles.failSub, { color: colors.mutedForeground }]}>
            Face not recognized or challenge not completed.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.accent }]}
            onPress={handleRetry}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  return null;
}

function VerifyRow({ label, status, colors }: { label: string; status: "idle" | "loading" | "ok"; colors: ReturnType<typeof useColors> }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (status === "loading") {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ).start();
    }
  }, [status]);
  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View style={verifyStyles.row}>
      {status === "loading" ? (
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="sync-outline" size={18} color={colors.primary} />
        </Animated.View>
      ) : status === "ok" ? (
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
      ) : (
        <Ionicons name="ellipse-outline" size={18} color={colors.mutedForeground} />
      )}
      <Text style={[verifyStyles.label, { color: status === "idle" ? colors.mutedForeground : colors.foreground }]}>{label}</Text>
    </View>
  );
}

const verifyStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 0 },
  iconBadge: { width: 80, height: 80, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 20 },
  challengeTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 10 },
  challengeDesc: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 16 },
  attemptBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 8 },
  attemptText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  countdownSection: { alignItems: "center", marginVertical: 16 },
  countdownNum: { fontSize: 64, fontFamily: "Inter_700Bold", lineHeight: 72 },
  countdownLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  progressBarOuter: { width: "100%" },
  progressBarBg: { height: 4, borderRadius: 2, overflow: "hidden", width: "100%" },
  progressBarFill: { height: 4, borderRadius: 2 },
  cameraTop: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", zIndex: 10, paddingHorizontal: 20 },
  challengeChip: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 20, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14, maxWidth: 300 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  verifyingOverlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  verifyCard: { borderRadius: 16, borderWidth: 1, padding: 24, width: 260, gap: 4 },
  cameraBottom: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", gap: 12 },
  captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  captureInner: { width: 62, height: 62, borderRadius: 31 },
  captureHint: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  successRing: { width: 136, height: 136, borderRadius: 68, borderWidth: 3, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  successTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 8, textAlign: "center" },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  failRing: { width: 136, height: 136, borderRadius: 68, borderWidth: 3, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  failTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 8, textAlign: "center" },
  failSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  retryText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
