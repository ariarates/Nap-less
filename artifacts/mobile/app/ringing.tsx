import { Ionicons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
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

import { useAlarm } from "@/contexts/AlarmContext";
import { useColors } from "@/hooks/useColors";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function RingingScreen() {
  useKeepAwake();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { config, stopAlarm, isRinging } = useAlarm();
  const [time, setTime] = React.useState(new Date());

  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isRinging) {
      router.replace("/home");
    }
  }, [isRinging]);

  useEffect(() => {
    if (Platform.OS === "android") {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
      return () => sub.remove();
    }
  }, []);

  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    createPulse(pulseAnim1, 0).start();
    createPulse(pulseAnim2, 500).start();
    createPulse(pulseAnim3, 1000).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        Animated.delay(2000),
      ])
    ).start();
  }, []);

  const makePulseStyle = (anim: Animated.Value, size: number) => ({
    position: "absolute" as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: "#FF4F4F",
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
  });

  const hours = time.getHours();
  const h12 = hours % 12 || 12;
  const ampm = hours < 12 ? "AM" : "PM";

  return (
    <View style={styles.fill}>
      <LinearGradient colors={["#1A0505", "#200808", "#0A0000"]} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.pulse, makePulseStyle(pulseAnim1, 240)]} />
      <Animated.View style={[styles.pulse, makePulseStyle(pulseAnim2, 240)]} />
      <Animated.View style={[styles.pulse, makePulseStyle(pulseAnim3, 240)]} />

      <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) }]}>
        <Text style={[styles.wakeText, { color: "#FF4F4F" }]}>WAKE UP</Text>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <Animated.View style={[styles.iconRing, { opacity: glowAnim, borderColor: "#FF4F4F" }]}>
            <Ionicons name="alarm" size={56} color="#FF4F4F" />
          </Animated.View>
        </Animated.View>

        <View style={styles.timeSection}>
          <Text style={styles.timeText}>
            {pad(h12)}:{pad(time.getMinutes())}
          </Text>
          <Text style={styles.ampmText}>{ampm}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.alarmLabel}>ALARM RINGING</Text>
          <Text style={styles.infoNote}>
            Complete the challenge to silence the alarm
          </Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => router.replace("/challenge")}
          >
            <Ionicons name="camera-outline" size={24} color="#fff" />
            <Text style={styles.dismissText}>Dismiss Alarm</Text>
          </TouchableOpacity>

          <Text style={styles.cantSkip}>
            You cannot skip the challenge
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pulse: { position: "absolute", alignSelf: "center", top: "35%" },
  container: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 28 },
  wakeText: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 6, marginTop: 8 },
  iconRing: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 8 },
  timeSection: { alignItems: "center" },
  timeText: { fontSize: 80, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 88 },
  ampmText: { fontSize: 24, fontFamily: "Inter_600SemiBold", color: "#FF4F4F", letterSpacing: 3 },
  infoSection: { alignItems: "center", gap: 6 },
  alarmLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 3, color: "#FF4F4F" },
  infoNote: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", textAlign: "center" },
  bottom: { width: "100%", alignItems: "center", gap: 12 },
  dismissBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FF4F4F",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: "100%",
    justifyContent: "center",
  },
  dismissText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  cantSkip: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)" },
});
