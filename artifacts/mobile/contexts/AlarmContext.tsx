import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { Alert, AppState, Platform } from "react-native";
import NativeAlarm from "@/modules/napless-alarm";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ALARM_KEY = "napless_alarm_config";
export type AlarmRepeatMode = "daily" | "weekdays" | "monthly" | "dates";

export const PRESET_RINGTONES = [
  {
    id: "classic",
    name: "Classic Alarm",
    uri: "https://assets.mixkit.co/sfx/preview/mixkit-alarm-clock-beep-988.mp3",
    icon: "alarm-outline" as const,
  },
  {
    id: "gentle",
    name: "Gentle Bell",
    uri: "https://assets.mixkit.co/sfx/preview/mixkit-morning-clock-alarm-1003.mp3",
    icon: "notifications-outline" as const,
  },
  {
    id: "digital",
    name: "Digital Beep",
    uri: "https://assets.mixkit.co/sfx/preview/mixkit-digital-alarm-990.mp3",
    icon: "pulse-outline" as const,
  },
  {
    id: "rooster",
    name: "Rise & Shine",
    uri: "https://assets.mixkit.co/sfx/preview/mixkit-rooster-crowing-in-the-morning-2462.mp3",
    icon: "sunny-outline" as const,
  },
];

export const CHALLENGES = [
  {
    id: "teeth",
    label: "Brush your teeth",
    description: "Take a selfie with a toothbrush near your mouth",
    icon: "water-outline" as const,
  },
  {
    id: "squat",
    label: "10 squats",
    description: "Take a selfie in a squat position showing your whole body",
    icon: "fitness-outline" as const,
  },
  {
    id: "book",
    label: "Read a page",
    description: "Take a selfie smiling while holding a book",
    icon: "book-outline" as const,
  },
  {
    id: "water",
    label: "Drink water",
    description: "Take a selfie holding a glass of water",
    icon: "cafe-outline" as const,
  },
  {
    id: "outside",
    label: "Step outside",
    description: "Take a selfie in natural daylight outside",
    icon: "sunny-outline" as const,
  },
  {
    id: "jumping",
    label: "Jumping jacks",
    description: "Take a selfie with both arms raised overhead",
    icon: "body-outline" as const,
  },
  {
    id: "custom",
    label: "Custom challenge",
    description: "",
    icon: "pencil-outline" as const,
  },
];

export interface AlarmConfig {
  id: string;
  enabled: boolean;
  hour: number;
  minute: number;
  challengeId: string;
  repeatMode: AlarmRepeatMode;
  weekdays: number[];
  monthDays: number[];
  dates: string[];
  customChallenge?: string;
  notificationId?: string;
  ringtoneUri?: string;
  ringtoneName?: string;
}

interface AlarmContextType {
  alarms: AlarmConfig[];
  loaded: boolean;
  config: AlarmConfig | null;
  isRinging: boolean;
  saveAlarm: (config: AlarmConfig) => Promise<void>;
  setAlarmEnabled: (id: string, enabled: boolean) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
  triggerAlarm: (id?: string) => void;
  stopAlarm: () => void;
  getChallenge: () => (typeof CHALLENGES)[0] | undefined;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

async function requestNotificationPermissions() {
  if (Platform.OS === "web") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function scheduleAlarmNotification(config: AlarmConfig): Promise<string | undefined> {
  if (Platform.OS === "web") return undefined;
  try {
    const alarm = nextAlarmDate(config);
    if (!alarm) return undefined;
    if (Platform.OS === "android") {
      await requestNotificationPermissions().catch(() => false);
      await NativeAlarm.scheduleAlarm(
        config.id,
        alarm.getTime(),
        config.ringtoneUri ?? PRESET_RINGTONES[0].uri,
        config.repeatMode,
        config.weekdays,
        config.monthDays,
        config.dates
      );
      return undefined;
    }
    const granted = await requestNotificationPermissions();
    if (!granted) return undefined;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Nap-Less Alarm",
        body: "Time to wake up! Complete your challenge to dismiss.",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { type: "alarm", alarmId: config.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: alarm,
      },
    });
    return id;
  } catch (error) {
    if (Platform.OS === "android") throw error;
    return undefined;
  }
}

async function cancelAlarmSchedule(config?: AlarmConfig) {
  if (Platform.OS === "android") {
    await NativeAlarm.cancelAlarm(config?.id);
  }
  if (!config?.notificationId || Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(config.notificationId);
  } catch {}
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function alarmOccursOn(config: AlarmConfig, date: Date) {
  if (config.repeatMode === "weekdays") return config.weekdays.includes(date.getDay());
  if (config.repeatMode === "monthly") return config.monthDays.includes(date.getDate());
  if (config.repeatMode === "dates") return config.dates.includes(dateKey(date));
  return true;
}

export function nextAlarmDate(config: AlarmConfig, after = new Date()) {
  const candidate = new Date(after);
  candidate.setSeconds(0, 0);
  for (let offset = 0; offset <= 370; offset++) {
    const day = new Date(candidate);
    day.setDate(candidate.getDate() + offset);
    day.setHours(config.hour, config.minute, 0, 0);
    if (day <= after) continue;
    if (!alarmOccursOn(config, day)) continue;
    return day;
  }
  return null;
}

function normalizeAlarm(value: Partial<AlarmConfig>, index: number): AlarmConfig {
  return {
    ...value,
    id: value.id ?? `legacy-${index}`,
    enabled: Boolean(value.enabled),
    hour: value.hour ?? 7,
    minute: value.minute ?? 0,
    challengeId: value.challengeId ?? CHALLENGES[0].id,
    repeatMode: value.repeatMode ?? "daily",
    weekdays: value.weekdays ?? [],
    monthDays: value.monthDays ?? [],
    dates: value.dates ?? [],
  };
}

let hapticInterval: ReturnType<typeof setInterval> | null = null;
let alarmSoundInstance: Audio.Sound | null = null;

function startHapticAlarm() {
  if (Platform.OS === "web") return;
  let tick = 0;
  hapticInterval = setInterval(() => {
    const pattern = tick % 3;
    if (pattern === 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (pattern === 1) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    tick++;
  }, 600);
}

function stopHapticAlarm() {
  if (hapticInterval) {
    clearInterval(hapticInterval);
    hapticInterval = null;
  }
}

async function startAlarmSound(uri?: string) {
  if (Platform.OS !== "ios") return;
  try {
    await stopAlarmSound();
    await Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    const source = { uri: uri ?? PRESET_RINGTONES[0].uri };
    const { sound } = await Audio.Sound.createAsync(source, {
      isLooping: true,
      volume: 1.0,
    });
    alarmSoundInstance = sound;
    await sound.playAsync();
  } catch {
    // Silent fallback — haptics will still run
  }
}

async function stopAlarmSound() {
  if (alarmSoundInstance) {
    try {
      await alarmSoundInstance.stopAsync();
      await alarmSoundInstance.unloadAsync();
    } catch {}
    alarmSoundInstance = null;
  }
}

export function AlarmProvider({ children }: { children: ReactNode }) {
  const [alarms, setAlarms] = useState<AlarmConfig[]>([]);
  const alarmsRef = useRef<AlarmConfig[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeAlarmId, setActiveAlarmId] = useState<string | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const triggeredRef = useRef(new Set<string>());

  const updateAlarms = useCallback(async (next: AlarmConfig[]) => {
    alarmsRef.current = next;
    setAlarms(next);
    await AsyncStorage.setItem(ALARM_KEY, JSON.stringify(next));
  }, []);

  const config = alarms.find((alarm) => alarm.id === activeAlarmId)
    ?? alarms.find((alarm) => alarm.enabled)
    ?? alarms[0]
    ?? null;

  useEffect(() => {
    let cancelled = false;
    const restoreAlarm = async () => {
      const data = await AsyncStorage.getItem(ALARM_KEY);
      if (cancelled) return;
      if (!data) {
        setLoaded(true);
        return;
      }
      const stored = JSON.parse(data) as Partial<AlarmConfig> | Partial<AlarmConfig>[];
      const source = Array.isArray(stored) ? stored : [stored];
      let restored = source.map(normalizeAlarm);
      if (Platform.OS === "android") await NativeAlarm.cancelAlarm();
      for (let index = 0; index < restored.length; index++) {
        const alarm = restored[index];
        if (alarm.notificationId) await cancelAlarmSchedule(alarm);
        if (alarm.enabled) {
          if (!nextAlarmDate(alarm)) {
            await cancelAlarmSchedule(alarm);
            restored[index] = { ...alarm, enabled: false, notificationId: undefined };
            continue;
          }
          const notificationId = await scheduleAlarmNotification(alarm);
          restored[index] = { ...alarm, notificationId };
        }
      }
      if (!cancelled) await updateAlarms(restored);
      if (!cancelled) setLoaded(true);
    };
    void restoreAlarm().catch(() => {
      Alert.alert(
        "Alarm couldn't be restored",
        "Check Nap-Less's Alarms & reminders permission in Android settings, then reopen the app."
      );
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [updateAlarms]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const syncRingingState = async () => {
      const alarmId = await NativeAlarm.getRingingAlarmId();
      setActiveAlarmId(alarmId);
      setIsRinging(Boolean(alarmId));
    };
    void syncRingingState();
    const poll = setInterval(() => {
      if (AppState.currentState === "active") void syncRingingState();
    }, 1000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncRingingState();
    });
    return () => {
      clearInterval(poll);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === "alarm") triggerAlarm(String(data.alarmId ?? "") || undefined);
    });
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      if (data?.type === "alarm") triggerAlarm(String(data.alarmId ?? "") || undefined);
    });
    return () => { sub.remove(); received.remove(); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Platform.OS === "android" || isRinging) return;
      const now = new Date();
      alarms.forEach((alarm) => {
        if (!alarm.enabled || triggeredRef.current.has(alarm.id)) return;
        if (now.getHours() !== alarm.hour || now.getMinutes() !== alarm.minute || now.getSeconds() >= 30) return;
        if (!alarmOccursOn(alarm, now)) return;
        triggeredRef.current.add(alarm.id);
        triggerAlarm(alarm.id);
        setTimeout(() => triggeredRef.current.delete(alarm.id), 70_000);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [alarms, isRinging]);

  const saveAlarm = useCallback(async (newConfig: AlarmConfig) => {
    if (newConfig.enabled && !nextAlarmDate(newConfig)) {
      throw new Error("Choose a future time or date for this alarm.");
    }
    const current = alarmsRef.current;
    const previous = current.find((alarm) => alarm.id === newConfig.id);
    if (previous) await cancelAlarmSchedule(previous);
    const notificationId = newConfig.enabled ? await scheduleAlarmNotification(newConfig) : undefined;
    const updated = { ...newConfig, notificationId };
    const next = previous
      ? current.map((alarm) => alarm.id === updated.id ? updated : alarm)
      : [...current, updated];
    await updateAlarms(next);
  }, [updateAlarms]);

  const setAlarmEnabled = useCallback(async (id: string, enabled: boolean) => {
    const current = alarmsRef.current;
    const previous = current.find((alarm) => alarm.id === id);
    if (!previous) return;
    if (enabled && !nextAlarmDate(previous)) {
      throw new Error("Choose a future date for this alarm.");
    }
    await cancelAlarmSchedule(previous);
    const updated: AlarmConfig = { ...previous, enabled, notificationId: undefined };
    if (enabled) updated.notificationId = await scheduleAlarmNotification(updated);
    await updateAlarms(current.map((alarm) => alarm.id === id ? updated : alarm));
  }, [updateAlarms]);

  const deleteAlarm = useCallback(async (id: string) => {
    const current = alarmsRef.current;
    const removed = current.find((alarm) => alarm.id === id);
    if (removed) await cancelAlarmSchedule(removed);
    await updateAlarms(current.filter((alarm) => alarm.id !== id));
  }, [updateAlarms]);

  const triggerAlarm = useCallback((id?: string) => {
    const ringingAlarm = alarmsRef.current.find((alarm) => alarm.id === id)
      ?? alarmsRef.current.find((alarm) => alarm.enabled)
      ?? null;
    setActiveAlarmId(ringingAlarm?.id ?? null);
    setIsRinging(true);
    startHapticAlarm();
    startAlarmSound(ringingAlarm?.ringtoneUri);
  }, []);

  const stopAlarm = useCallback(() => {
    const stopped = alarmsRef.current.find((alarm) => alarm.id === activeAlarmId);
    setIsRinging(false);
    setActiveAlarmId(null);
    stopHapticAlarm();
    if (Platform.OS === "android") void NativeAlarm.stopAlarm();
    else void stopAlarmSound();
    if (stopped?.repeatMode === "dates" && !nextAlarmDate(stopped)) {
      void setAlarmEnabled(stopped.id, false);
    }
  }, [activeAlarmId, setAlarmEnabled]);

  const getChallenge = useCallback(() => {
    const active = alarmsRef.current.find((alarm) => alarm.id === activeAlarmId)
      ?? alarmsRef.current.find((alarm) => alarm.enabled)
      ?? alarmsRef.current[0];
    if (!active) return CHALLENGES[0];
    return CHALLENGES.find((c) => c.id === active.challengeId) ?? CHALLENGES[0];
  }, [activeAlarmId]);

  return (
    <AlarmContext.Provider value={{ alarms, loaded, config, isRinging, saveAlarm, setAlarmEnabled, deleteAlarm, triggerAlarm, stopAlarm, getChallenge }}>
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error("useAlarm must be used within AlarmProvider");
  return ctx;
}
