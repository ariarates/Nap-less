import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlarmConfig, useAlarm } from "@/contexts/AlarmContext";
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

function formatRepeat(alarm: AlarmConfig) {
  if (alarm.repeatMode === "daily") return "Every day";
  if (alarm.repeatMode === "weekdays") {
    return alarm.weekdays.map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]).join(" · ");
  }
  if (alarm.repeatMode === "monthly") return `Monthly · ${alarm.monthDays.join(", ")}`;
  const selected = alarm.dates.slice(0, 3).map((date) =>
    new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  );
  return `${selected.join(", ")}${alarm.dates.length > 3 ? ` +${alarm.dates.length - 3}` : ""}`;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { alarms, setAlarmEnabled, deleteAlarm, isRinging } = useAlarm();
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
    if (alarms.some((alarm) => alarm.enabled)) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [alarms]);

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

  return (
    <LinearGradient colors={["#080C14", "#0B1020", "#080C14"]} style={styles.fill}>
      <Animated.View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={[styles.appName, { color: colors.mutedForeground }]}>NAP-LESS</Text>
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
          <View style={styles.alarmHeading}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ALARMS</Text>
            <Text style={[styles.alarmCount, { color: colors.mutedForeground }]}>{alarms.length}</Text>
          </View>
          {alarms.length > 0 ? (
            <ScrollView style={styles.alarmList} contentContainerStyle={styles.alarmListContent} showsVerticalScrollIndicator>
              {[...alarms].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)).map((alarm) => (
                <View key={alarm.id} style={[styles.alarmCard, { backgroundColor: colors.card, borderColor: alarm.enabled ? colors.primary + "40" : colors.border }]}>
                  <View style={styles.alarmCardTop}>
                    <View style={styles.alarmTimeRow}>
                      <Ionicons name="alarm-outline" size={18} color={alarm.enabled ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.alarmTime, { color: alarm.enabled ? colors.foreground : colors.mutedForeground }]}>
                        {formatAlarmTime(alarm.hour, alarm.minute)}
                      </Text>
                    </View>
                    <View style={styles.alarmActions}>
                      <TouchableOpacity accessibilityLabel="Edit alarm" onPress={() => router.push({ pathname: "/configure", params: { id: alarm.id } })}>
                        <Ionicons name="pencil-outline" size={18} color={colors.mutedForeground} />
                      </TouchableOpacity>
                      <TouchableOpacity accessibilityLabel="Delete alarm" onPress={() => Alert.alert("Delete alarm?", "This alarm will be removed.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void deleteAlarm(alarm.id) }])}>
                        <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
                      </TouchableOpacity>
                      <Switch
                        value={alarm.enabled}
                        onValueChange={async (enabled) => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          try {
                            await setAlarmEnabled(alarm.id, enabled);
                          } catch {
                            Alert.alert("Couldn't update alarm", "Check Nap-Less's Alarms & reminders permission, then try again.");
                          }
                        }}
                        trackColor={{ false: colors.border, true: colors.primary + "80" }}
                        thumbColor={alarm.enabled ? colors.primary : colors.mutedForeground}
                      />
                    </View>
                  </View>
                  <Text style={[styles.repeatLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{formatRepeat(alarm)}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.emptyAlarm, { borderColor: colors.border }]}>
              <Ionicons name="alarm-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No alarms set</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Add an alarm to get started
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
            <Ionicons name="add" size={22} color={colors.primaryForeground} />
            <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>Add alarm</Text>
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
  alarmHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  alarmCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  alarmList: { maxHeight: 220 },
  alarmListContent: { gap: 8, paddingBottom: 2 },
  alarmActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  repeatLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
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
