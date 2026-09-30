import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
import { CHALLENGES, PRESET_RINGTONES, useAlarm } from "@/contexts/AlarmContext";
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
  const { config, setConfig } = useAlarm();

  const [hour, setHour] = useState(config?.hour ?? 7);
  const [minute, setMinute] = useState(config?.minute ?? 0);
  const [challengeId, setChallengeId] = useState(config?.challengeId ?? CHALLENGES[0].id);
  const [customChallenge, setCustomChallenge] = useState(config?.customChallenge ?? "");
  const [ringtoneUri, setRingtoneUri] = useState(config?.ringtoneUri ?? PRESET_RINGTONES[0].uri);
  const [ringtoneName, setRingtoneName] = useState(config?.ringtoneName ?? PRESET_RINGTONES[0].name);
  const [showRingtonePicker, setShowRingtonePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setConfig({
      enabled: true,
      hour,
      minute,
      challengeId,
      customChallenge: challengeId === "custom" ? customChallenge : undefined,
      ringtoneUri,
      ringtoneName,
    });
    router.back();
  };

  const h12 = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";

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
          <Text style={[styles.title, { color: colors.foreground }]}>Set Alarm</Text>
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
              {saving ? "Saving..." : "Save Alarm"}
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
