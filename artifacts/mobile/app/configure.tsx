import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RingtonePicker } from "@/components/RingtonePicker";
import { AlarmConfig, AlarmRepeatMode, CHALLENGES, dateKey, PRESET_RINGTONES, useAlarm } from "@/contexts/AlarmContext";
import { useColors } from "@/hooks/useColors";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function NumberSpinner({
  value,
  min,
  max,
  onChange,
  colors,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const increment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value >= max ? min : value + 1);
  };
  const decrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value <= min ? max : value - 1);
  };
  return (
    <View style={spinStyles.wrapper}>
      <TouchableOpacity onPress={increment} style={spinStyles.btn}>
        <Ionicons name="chevron-up" size={24} color={colors.primary} />
      </TouchableOpacity>
      <View style={[spinStyles.display, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[spinStyles.number, { color: colors.foreground }]}>{pad(value)}</Text>
      </View>
      <TouchableOpacity onPress={decrement} style={spinStyles.btn}>
        <Ionicons name="chevron-down" size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const spinStyles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: 4 },
  btn: { padding: 8 },
  display: { width: 88, height: 88, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  number: { fontSize: 44, fontFamily: "Inter_700Bold" },
});

export default function ConfigureScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { alarms, saveAlarm } = useAlarm();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingAlarm = alarms.find((alarm) => alarm.id === id);

  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [challengeId, setChallengeId] = useState(CHALLENGES[0].id);
  const [customChallenge, setCustomChallenge] = useState("");
  const [ringtoneUri, setRingtoneUri] = useState(PRESET_RINGTONES[0].uri);
  const [ringtoneName, setRingtoneName] = useState(PRESET_RINGTONES[0].name);
  const [repeatMode, setRepeatMode] = useState<AlarmRepeatMode>("daily");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [monthDays, setMonthDays] = useState<number[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showRingtonePicker, setShowRingtonePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editingAlarm) return;
    setHour(editingAlarm.hour);
    setMinute(editingAlarm.minute);
    setChallengeId(editingAlarm.challengeId);
    setCustomChallenge(editingAlarm.customChallenge ?? "");
    setRingtoneUri(editingAlarm.ringtoneUri ?? PRESET_RINGTONES[0].uri);
    setRingtoneName(editingAlarm.ringtoneName ?? PRESET_RINGTONES[0].name);
    setRepeatMode(editingAlarm.repeatMode);
    setWeekdays(editingAlarm.weekdays);
    setMonthDays(editingAlarm.monthDays);
    setDates(editingAlarm.dates);
    if (editingAlarm.dates.length > 0) {
      const [year, month] = editingAlarm.dates[0].split("-").map(Number);
      setVisibleMonth(new Date(year, month - 1, 1));
    }
  }, [editingAlarm?.id]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (repeatMode === "weekdays" && weekdays.length === 0) {
        Alert.alert("Choose days", "Select at least one weekday for this alarm.");
        return;
      }
      if (repeatMode === "dates" && dates.length === 0) {
        Alert.alert("Choose dates", "Select at least one future date on the calendar.");
        return;
      }
      if (repeatMode === "monthly" && monthDays.length === 0) {
        Alert.alert("Choose days", "Select at least one day of the month on the calendar.");
        return;
      }
      const config: AlarmConfig = {
        id: editingAlarm?.id ?? `alarm-${Date.now()}`,
        enabled: true,
        hour,
        minute,
        challengeId,
        repeatMode,
        weekdays,
        monthDays,
        dates,
        customChallenge: challengeId === "custom" ? customChallenge : undefined,
        ringtoneUri,
        ringtoneName,
      };
      await saveAlarm(config);
      router.back();
    } catch (error) {
      const hasNoFutureOccurrence = error instanceof Error && error.message.includes("future");
      Alert.alert(
        "Couldn't set alarm",
        hasNoFutureOccurrence
          ? "Choose a future time or calendar date for this alarm."
          : Platform.OS === "android"
          ? "Check Nap-Less's Alarms & reminders permission in Android settings, then try again."
          : "Check your notification permissions, then try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const h12 = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const monthOffset = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const day = index - monthOffset + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const todayKey = dateKey(new Date());
  const latestDate = new Date();
  latestDate.setDate(latestDate.getDate() + 370);
  const latestKey = dateKey(latestDate);

  const ringtoneIcon =
    !ringtoneUri
      ? "phone-portrait-outline"
      : (PRESET_RINGTONES.find((r) => r.uri === ringtoneUri)?.icon ?? "musical-note-outline");

  return (
    <LinearGradient colors={["#080C14", "#0B1020", "#080C14"]} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>{editingAlarm ? "Edit Alarm" : "New Alarm"}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WAKE UP TIME</Text>
            <View style={styles.timeRow}>
              <NumberSpinner value={hour} min={0} max={23} onChange={setHour} colors={colors} />
              <Text style={[styles.colon, { color: colors.primary }]}>:</Text>
              <NumberSpinner value={minute} min={0} max={59} onChange={setMinute} colors={colors} />
              <View style={[styles.ampmBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <TouchableOpacity onPress={() => setHour(hour < 12 ? hour + 12 : hour - 12)}>
                  <Text style={[styles.ampmText, { color: colors.primary }]}>{ampm}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.timePreview, { color: colors.mutedForeground }]}>
              Alarm will ring at {h12}:{pad(minute)} {ampm}
            </Text>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>REPEAT</Text>
            <View style={styles.repeatModes}>
              {([
                ["daily", "Every day"],
                ["weekdays", "Weekdays"],
                ["monthly", "Monthly"],
                ["dates", "Selected dates"],
              ] as [AlarmRepeatMode, string][]).map(([mode, label]) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setRepeatMode(mode)}
                  style={[styles.repeatMode, { backgroundColor: repeatMode === mode ? colors.primary : colors.secondary, borderColor: repeatMode === mode ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.repeatModeText, { color: repeatMode === mode ? colors.primaryForeground : colors.mutedForeground }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {repeatMode === "weekdays" && (
              <View style={styles.weekdayRow}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, day) => {
                  const selected = weekdays.includes(day);
                  return (
                    <TouchableOpacity
                      key={label}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => setWeekdays(selected ? weekdays.filter((value) => value !== day) : [...weekdays, day].sort())}
                      style={[styles.weekdayButton, { backgroundColor: selected ? colors.primary : colors.secondary, borderColor: selected ? colors.primary : colors.border }]}
                    >
                      <Text style={[styles.weekdayText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {(repeatMode === "monthly" || repeatMode === "dates") && (
              <View style={styles.calendar}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>
                    <Ionicons name="chevron-back" size={20} color={colors.foreground} />
                  </TouchableOpacity>
                  <Text style={[styles.calendarMonth, { color: colors.foreground }]}>
                    {visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </Text>
                  <TouchableOpacity onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>
                    <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarGrid}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
                    <Text key={`${label}-${index}`} style={[styles.calendarWeekday, { color: colors.mutedForeground }]}>{label}</Text>
                  ))}
                  {calendarCells.map((day, index) => {
                    if (!day) return <View key={`empty-${index}`} style={styles.calendarCell} />;
                    const key = dateKey(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
                    const selected = repeatMode === "monthly" ? monthDays.includes(day) : dates.includes(key);
                    const isOutsideRange = repeatMode === "dates" && (key < todayKey || key > latestKey);
                    return (
                      <TouchableOpacity
                        key={key}
                        disabled={isOutsideRange}
                        onPress={() => {
                          if (repeatMode === "monthly") {
                            setMonthDays(selected ? monthDays.filter((value) => value !== day) : [...monthDays, day].sort((a, b) => a - b));
                          } else {
                            setDates(selected ? dates.filter((date) => date !== key) : [...dates, key].sort());
                          }
                        }}
                        style={[styles.calendarCell, styles.calendarDate, { backgroundColor: selected ? colors.primary : "transparent", borderColor: selected ? colors.primary : "transparent", opacity: isOutsideRange ? 0.3 : 1 }]}
                      >
                        <Text style={[styles.calendarDateText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[styles.selectedDatesText, { color: colors.mutedForeground }]}>
                  {repeatMode === "monthly"
                    ? monthDays.length ? `${monthDays.length} day${monthDays.length === 1 ? "" : "s"} each month` : "Select one or more days each month"
                    : dates.length ? `${dates.length} date${dates.length === 1 ? "" : "s"} selected` : "Select one or more future dates"}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ALARM SOUND</Text>
            <TouchableOpacity
              style={[styles.ringtoneRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}
              onPress={() => setShowRingtonePicker(true)}
            >
              <View style={[styles.ringtoneIcon, { backgroundColor: colors.card }]}>
                <Ionicons name={ringtoneIcon as never} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ringtoneName, { color: colors.foreground }]}>{ringtoneName}</Text>
                <Text style={[styles.ringtoneSub, { color: colors.mutedForeground }]}>
                  {!ringtoneUri ? "Vibration only" : "Tap to change"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WAKE-UP CHALLENGE</Text>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              You must complete this challenge to stop the alarm
            </Text>
            <View style={styles.challengeList}>
              {CHALLENGES.map((ch) => (
                <TouchableOpacity
                  key={ch.id}
                  style={[
                    styles.challengeItem,
                    {
                      backgroundColor: challengeId === ch.id ? colors.primary + "20" : colors.secondary,
                      borderColor: challengeId === ch.id ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setChallengeId(ch.id);
                  }}
                >
                  <Ionicons
                    name={ch.icon}
                    size={20}
                    color={challengeId === ch.id ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.challengeText,
                      { color: challengeId === ch.id ? colors.foreground : colors.mutedForeground },
                    ]}
                  >
                    {ch.label}
                  </Text>
                  {challengeId === ch.id && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {challengeId === "custom" && (
              <TextInput
                style={[styles.customInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                placeholder="Describe your challenge..."
                placeholderTextColor={colors.mutedForeground}
                value={customChallenge}
                onChangeText={setCustomChallenge}
                multiline
                maxLength={120}
              />
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 12) }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: saving ? colors.primary + "80" : colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons name="checkmark" size={22} color={colors.primaryForeground} />
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
              {saving ? "Saving..." : editingAlarm ? "Save Changes" : "Add Alarm"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <RingtonePicker
        visible={showRingtonePicker}
        currentUri={ringtoneUri}
        currentName={ringtoneName}
        onSelect={(uri, name) => {
          setRingtoneUri(uri);
          setRingtoneName(name);
          setShowRingtonePicker(false);
        }}
        onClose={() => setShowRingtonePicker(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  scrollContent: { gap: 16, paddingBottom: 20 },
  section: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 14 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  sectionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6 },
  repeatModes: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  repeatMode: { width: "48%", minHeight: 40, borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  repeatModeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  weekdayRow: { flexDirection: "row", justifyContent: "space-between", gap: 5 },
  weekdayButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  weekdayText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  calendar: { gap: 12 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calendarMonth: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarWeekday: { width: `${100 / 7}%`, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold", paddingVertical: 8 },
  calendarCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  calendarDate: { borderWidth: 1, borderRadius: 22 },
  calendarDateText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  selectedDatesText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  colon: { fontSize: 48, fontFamily: "Inter_700Bold", lineHeight: 56 },
  ampmBox: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginLeft: 8 },
  ampmText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  timePreview: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  ringtoneRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  ringtoneIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ringtoneName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  ringtoneSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  challengeList: { gap: 8 },
  challengeItem: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14 },
  challengeText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  customInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 72 },
  footer: { paddingTop: 8 },
  saveBtn: { borderRadius: 14, paddingVertical: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
