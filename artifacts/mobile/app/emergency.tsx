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

import { useAlarm } from "@/contexts/AlarmContext";
import { useFace } from "@/contexts/FaceContext";
import { useColors } from "@/hooks/useColors";

export default function EmergencyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { stopAlarm, isRinging } = useAlarm();
  const { emergencyCode, clearFace } = useFace();
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "fail">("idle");

  const handleSubmit = () => {
    if (input.trim() === emergencyCode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStatus("success");
      if (isRinging) stopAlarm();
      setTimeout(() => router.replace("/home"), 1500);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatus("fail");
      setTimeout(() => setStatus("idle"), 1500);
    }
  };

  return (
    <LinearGradient colors={["#080C14", "#0D1628", "#080C14"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24), paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Emergency Access</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.warningBox, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
          <Ionicons name="warning-outline" size={22} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            Emergency access bypasses facial recognition. Only use this if you genuinely cannot complete the challenge.
          </Text>
        </View>

        <View style={styles.codeSection}>
          <View style={[styles.iconBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="key-outline" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Enter Emergency Code</Text>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            Your emergency code was shown when you first set up the app. It is a long secret code stored only by you.
          </Text>

          <View style={[styles.codeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>Your emergency code is:</Text>
            <Text style={[styles.codeValue, { color: colors.mutedForeground }]} selectable>
              {emergencyCode}
            </Text>
            <Text style={[styles.codeNote, { color: colors.mutedForeground }]}>
              Save this somewhere safe — it cannot be recovered.
            </Text>
          </View>

          <TextInput
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.card,
                borderColor:
                  status === "success"
                    ? colors.success
                    : status === "fail"
                    ? colors.accent
                    : colors.border,
              },
            ]}
            placeholder="Paste or type your emergency code"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {status === "fail" && (
            <Text style={[styles.statusText, { color: colors.accent }]}>
              Incorrect code. Please try again.
            </Text>
          )}
          {status === "success" && (
            <Text style={[styles.statusText, { color: colors.success }]}>
              Access granted. Redirecting...
            </Text>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.warning }]}
            onPress={handleSubmit}
          >
            <Ionicons name="unlock-outline" size={20} color="#fff" />
            <Text style={styles.submitText}>Bypass with Code</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.resetSection}>
          <Text style={[styles.resetTitle, { color: colors.foreground }]}>Re-register Face</Text>
          <Text style={[styles.resetDesc, { color: colors.mutedForeground }]}>
            If your face registration is corrupted, you can clear it and register again.
          </Text>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.destructive + "40", backgroundColor: colors.destructive + "10" }]}
            onPress={async () => {
              await clearFace();
              router.replace("/setup");
            }}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.destructive} />
            <Text style={[styles.resetBtnText, { color: colors.destructive }]}>Clear & Re-register Face</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 20 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  warningBox: { flexDirection: "row", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "flex-start" },
  warningText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  codeSection: { gap: 14 },
  iconBadge: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, alignSelf: "center" },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  sectionDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  codeBox: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 6 },
  codeLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  codeValue: { fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 0.5, lineHeight: 18 },
  codeNote: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular" },
  statusText: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  submitBtn: { borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  divider: { height: 1 },
  resetSection: { gap: 10 },
  resetTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  resetDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  resetBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16, alignSelf: "flex-start" },
  resetBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
