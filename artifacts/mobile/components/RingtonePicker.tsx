import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PRESET_RINGTONES } from "@/contexts/AlarmContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  currentUri?: string;
  currentName?: string;
  onSelect: (uri: string, name: string) => void;
  onClose: () => void;
}

type Tab = "presets" | "device";

interface DeviceTrack {
  id: string;
  name: string;
  uri: string;
  duration: number;
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function PlayingBars({ color }: { color: string }) {
  const bar1 = useRef(new Animated.Value(0.4)).current;
  const bar2 = useRef(new Animated.Value(1)).current;
  const bar3 = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(v, { toValue: 0.2, duration: 300, useNativeDriver: false }),
        ])
      );
    anim(bar1, 0).start();
    anim(bar2, 150).start();
    anim(bar3, 300).start();
  }, []);

  return (
    <View style={barStyles.container}>
      {[bar1, bar2, bar3].map((bar, i) => (
        <Animated.View
          key={i}
          style={[barStyles.bar, { backgroundColor: color, transform: [{ scaleY: bar }] }]}
        />
      ))}
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 2, width: 20, height: 20, justifyContent: "center" },
  bar: { width: 3, height: 14, borderRadius: 2 },
});

export function RingtonePicker({ visible, currentUri, currentName, onSelect, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("presets");
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [deviceTracks, setDeviceTracks] = useState<DeviceTrack[]>([]);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [pendingUri, setPendingUri] = useState(currentUri ?? "");
  const [pendingName, setPendingName] = useState(currentName ?? PRESET_RINGTONES[0].name);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (visible) {
      setPendingUri(currentUri ?? "");
      setPendingName(currentName ?? PRESET_RINGTONES[0].name);
    } else {
      stopPreview();
      setTab("presets");
    }
  }, [visible]);

  const stopPreview = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setPlayingUri(null);
  }, []);

  const playPreview = useCallback(async (uri: string) => {
    await stopPreview();
    if (Platform.OS === "web") return;
    try {
      await Audio.setAudioModeAsync({ staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { volume: 1.0, isLooping: false }
      );
      soundRef.current = sound;
      setPlayingUri(uri);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setPlayingUri(null);
          soundRef.current = null;
        }
      });
    } catch {
      setPlayingUri(null);
    }
  }, [stopPreview]);

  const handleTap = useCallback((uri: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingUri(uri);
    setPendingName(name);
    if (uri) playPreview(uri);
    else stopPreview();
  }, [playPreview, stopPreview]);

  const handleDone = () => {
    stopPreview();
    onSelect(pendingUri, pendingName);
  };

  const handleCancel = () => {
    stopPreview();
    onClose();
  };

  const loadDeviceTracks = useCallback(async () => {
    if (loadingDevice) return;
    setLoadingDevice(true);
    try {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        first: 80,
        sortBy: MediaLibrary.SortBy.default,
      });
      setDeviceTracks(
        page.assets.map((a) => ({
          id: a.id,
          name: a.filename.replace(/\.[^/.]+$/, ""),
          uri: a.uri,
          duration: a.duration * 1000,
        }))
      );
    } catch {}
    setLoadingDevice(false);
  }, [loadingDevice]);

  const handleDeviceTab = async () => {
    setTab("device");
    if (mediaPermission?.granted) loadDeviceTracks();
  };

  const s = styles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={[s.root, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={handleCancel} style={s.headerBtn}>
            <Text style={[s.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Alarm Sound</Text>
          <TouchableOpacity onPress={handleDone} style={s.headerBtn}>
            <Text style={[s.doneText, { color: colors.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {pendingUri ? (
          <View style={[s.nowPlaying, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <PlayingBars color={playingUri ? colors.primary : colors.mutedForeground} />
            <Text style={[s.nowPlayingText, { color: playingUri ? colors.primary : colors.mutedForeground }]}>
              {pendingName}
            </Text>
          </View>
        ) : null}

        <View style={[s.tabs, { borderColor: colors.border }]}>
          <TouchableOpacity
            style={[s.tab, tab === "presets" && { borderBottomColor: colors.primary }]}
            onPress={() => { stopPreview(); setTab("presets"); }}
          >
            <Text style={[s.tabText, { color: tab === "presets" ? colors.primary : colors.mutedForeground }]}>
              Built-in
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, tab === "device" && { borderBottomColor: colors.primary }]}
            onPress={handleDeviceTab}
          >
            <Text style={[s.tabText, { color: tab === "device" ? colors.primary : colors.mutedForeground }]}>
              From Device
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {tab === "presets" && PRESET_RINGTONES.map((r) => {
            const isSelected = pendingUri === r.uri;
            const isPlaying = playingUri === r.uri;
            return (
              <TouchableOpacity
                key={r.id}
                style={[
                  s.item,
                  {
                    borderColor: isSelected ? colors.primary + "60" : colors.border,
                    backgroundColor: isSelected ? colors.primary + "12" : colors.card,
                  },
                ]}
                onPress={() => handleTap(r.uri, r.name)}
                activeOpacity={0.7}
              >
                <View style={[s.itemIcon, { backgroundColor: isSelected ? colors.primary + "25" : colors.secondary }]}>
                  {isPlaying ? (
                    <PlayingBars color={colors.primary} />
                  ) : (
                    <Ionicons name={r.icon} size={20} color={isSelected ? colors.primary : colors.mutedForeground} />
                  )}
                </View>
                <View style={s.itemInfo}>
                  <Text style={[s.itemName, { color: isSelected ? colors.foreground : colors.mutedForeground }]}>
                    {r.name}
                  </Text>
                  <Text style={[s.itemSub, { color: colors.mutedForeground }]}>
                    {isPlaying ? "Playing preview…" : "Tap to preview"}
                  </Text>
                </View>
                {isSelected && !isPlaying && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}

          {tab === "device" && (
            <>
              {!mediaPermission?.granted ? (
                <View style={s.permissionBox}>
                  <Ionicons name="musical-notes-outline" size={40} color={colors.mutedForeground} />
                  <Text style={[s.permTitle, { color: colors.foreground }]}>Access your music library</Text>
                  <Text style={[s.permDesc, { color: colors.mutedForeground }]}>
                    Allow Nap-Less to browse audio files stored on your device.
                  </Text>
                  <TouchableOpacity
                    style={[s.permBtn, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                      const result = await requestMediaPermission();
                      if (result.granted) loadDeviceTracks();
                    }}
                  >
                    <Text style={[s.permBtnText, { color: colors.primaryForeground }]}>Allow Access</Text>
                  </TouchableOpacity>
                </View>
              ) : loadingDevice ? (
                <View style={s.center}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={[s.loadingText, { color: colors.mutedForeground }]}>Loading audio files…</Text>
                </View>
              ) : deviceTracks.length === 0 ? (
                <View style={s.center}>
                  <Ionicons name="musical-notes-outline" size={40} color={colors.mutedForeground} />
                  <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No audio files found on device</Text>
                </View>
              ) : (
                deviceTracks.map((track) => {
                  const isSelected = pendingUri === track.uri;
                  const isPlaying = playingUri === track.uri;
                  return (
                    <TouchableOpacity
                      key={track.id}
                      style={[
                        s.item,
                        {
                          borderColor: isSelected ? colors.primary + "60" : colors.border,
                          backgroundColor: isSelected ? colors.primary + "12" : colors.card,
                        },
                      ]}
                      onPress={() => handleTap(track.uri, track.name)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.itemIcon, { backgroundColor: isSelected ? colors.primary + "25" : colors.secondary }]}>
                        {isPlaying ? (
                          <PlayingBars color={colors.primary} />
                        ) : (
                          <Ionicons name="musical-note" size={18} color={isSelected ? colors.primary : colors.mutedForeground} />
                        )}
                      </View>
                      <View style={s.itemInfo}>
                        <Text style={[s.itemName, { color: isSelected ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                          {track.name}
                        </Text>
                        <Text style={[s.itemSub, { color: colors.mutedForeground }]}>
                          {isPlaying ? "Playing preview…" : formatDuration(track.duration)}
                        </Text>
                      </View>
                      {isSelected && !isPlaying && (
                        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
    headerBtn: { minWidth: 60 },
    cancelText: { fontSize: 15, fontFamily: "Inter_400Regular" },
    doneText: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "right" },
    headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    nowPlaying: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
    nowPlayingText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
    tabs: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 8 },
    tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
    tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    list: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
    item: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
    itemIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    itemInfo: { flex: 1, gap: 2 },
    itemName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    itemSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
    permissionBox: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24, gap: 12 },
    permTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
    permDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
    permBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
    permBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    center: { alignItems: "center", paddingVertical: 48, gap: 12 },
    loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
