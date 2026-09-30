import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CHALLENGES, useAlarm } from "@/contexts/AlarmContext";
import { useFace } from "@/contexts/FaceContext";
import { useColors } from "@/hooks/useColors";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatAlarmTime(hour: number, minute: number) {
  const h12 = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h12}:${pad(minute)} ${ampm}`;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { config, setConfig, isRinging } = useAlarm();
  const { clearFace } = useFace();
  const [now, setNow] = useState(new Date());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (config?.enabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [config?.enabled]);

  useEffect(() => {
    if (isRinging) {
      router.replace("/ringing");
    }
  }, [isRinging]);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const h12 = hours % 12 || 12;
  const ampm = hours < 12 ? "AM" : "PM";

  const challenge = config ? CHALLENGES.find((c) => c.id === config.challengeId) ?? CHALLENGES[0] : null;

  const toggleAlarm = async () => {
    if (!config) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setConfig({ ...config, enabled: !config.enabled });
  };

  return (
    <LinearGradient colors={["#080C14", "#0B1020", "#080C14"]} style={styles.fill}>
      <Animated.View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={[styles.appName, { color: colors.mutedForeground }]}>NAPLESS</Text>
          <TouchableOpacity
            style={[styles.settingsBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => router.push("/emergency")}
          >
            <Ionicons name="shield-outline" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={styles.clockSection}>
          <View style={styles.clockRow}>
            <Text style={[styles.clockHour, { color: colors.foreground }]}>{pad(h12)}</Text>
            <Animated.Text style={[styles.clockColon, { color: colors.primary, opacity: dotAnim }]}>:</Animated.Text>
            <Text style={[styles.clockHour, { color: colors.foreground }]}>{pad(minutes)}</Text>
          </View>
          <View style={styles.clockSubRow}>
            <Text style={[styles.clockAmpm, { color: colors.primary }]}>{ampm}</Text>
            <Text style={[styles.clockSeconds, { color: colors.mutedForeground }]}>{pad(seconds)}</Text>
          </View>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>
        </View>

        <View style={styles.alarmSection}>
          {config ? (
            <View style={[styles.alarmCard, { backgroundColor: colors.card, borderColor: config.enabled ? colors.primary + "40" : colors.border }]}>
              <View style={styles.alarmCardTop}>
                <View style={styles.alarmTimeRow}>
                  <Ionicons name="alarm-outline" size={18} color={config.enabled ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.alarmTime, { color: config.enabled ? colors.foreground : colors.mutedForeground }]}>
                    {formatAlarmTime(config.hour, config.minute)}
                  </Text>
                </View>
                <Switch
                  value={config.enabled}
                  onValueChange={toggleAlarm}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={config.enabled ? colors.primary : colors.mutedForeground}
                />
              </View>
              {challenge && (
                <View style={[styles.challengeRow, { borderTopColor: colors.border }]}>
                  <Ionicons name={challenge.icon} size={14} color={colors.mutedForeground} />
                  <Text style={[styles.challengeLabel, { color: colors.mutedForeground }]}>
                    {challenge.id === "custom" ? config.customChallenge || challenge.label : challenge.label}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: colors.border }]}
                onPress={() => router.push("/configure")}
              >
                <Ionicons name="pencil-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.editBtnText, { color: colors.mutedForeground }]}>Edit alarm</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.emptyAlarm, { borderColor: colors.border }]}>
              <Ionicons name="alarm-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No alarm set</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Set an alarm to get started
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/configure");
            }}
          >
            <Ionicons name={config ? "create-outline" : "add"} size={22} color={colors.primaryForeground} />
            <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
              {config ? "Change Alarm" : "Set Alarm"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={async () => {
            await clearFace();
            router.replace("/setup");
          }}
        >
          <Ionicons name="finger-print-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.resetText, { color: colors.mutedForeground }]}>Re-register face</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  appName: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  settingsBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  clockSection: { flex: 1, alignItems: "center", justifyContent: "center" },
  clockRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  clockHour: { fontSize: 88, fontFamily: "Inter_700Bold", lineHeight: 96 },
  clockColon: { fontSize: 72, fontFamily: "Inter_700Bold", lineHeight: 96, marginHorizontal: -4 },
  clockSubRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: -4 },
  clockAmpm: { fontSize: 22, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  clockSeconds: { fontSize: 22, fontFamily: "Inter_400Regular" },
  dateText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8, letterSpacing: 0.5 },
  alarmSection: { gap: 12 },
  alarmCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 0 },
  alarmCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  alarmTimeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  alarmTime: { fontSize: 28, fontFamily: "Inter_700Bold" },
  challengeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  challengeLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignSelf: "flex-start", marginTop: 10 },
  editBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  emptyAlarm: { borderRadius: 18, borderWidth: 1, borderStyle: "dashed", padding: 28, alignItems: "center", gap: 6 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  addBtn: { borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  addBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  resetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, marginTop: 4 },
  resetText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
