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
import { Platform } from "react-native";

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
  enabled: boolean;
  hour: number;
  minute: number;
  challengeId: string;
  customChallenge?: string;
  notificationId?: string;
  ringtoneUri?: string;
  ringtoneName?: string;
}

interface AlarmContextType {
  config: AlarmConfig | null;
  isRinging: boolean;
  setConfig: (config: AlarmConfig) => Promise<void>;
  triggerAlarm: () => void;
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
    const granted = await requestNotificationPermissions();
    if (!granted) return undefined;
    const now = new Date();
    const alarm = new Date();
    alarm.setHours(config.hour, config.minute, 0, 0);
    if (alarm <= now) alarm.setDate(alarm.getDate() + 1);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Napless Alarm",
        body: "Time to wake up! Complete your challenge to dismiss.",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { type: "alarm" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: alarm,
      },
    });
    return id;
  } catch {
    return undefined;
  }
}

async function cancelNotification(id?: string) {
  if (!id || Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
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
  if (Platform.OS === "web") return;
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
  const [config, setConfigState] = useState<AlarmConfig | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const triggeredRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(ALARM_KEY).then((data) => {
      if (data) setConfigState(JSON.parse(data));
    });
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === "alarm") triggerAlarm();
    });
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      if (data?.type === "alarm") triggerAlarm();
    });
    return () => { sub.remove(); received.remove(); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!config?.enabled || isRinging || triggeredRef.current) return;
      const now = new Date();
      if (
        now.getHours() === config.hour &&
        now.getMinutes() === config.minute &&
        now.getSeconds() < 30
      ) {
        triggeredRef.current = true;
        triggerAlarm();
        setTimeout(() => { triggeredRef.current = false; }, 70000);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [config, isRinging]);

  const setConfig = useCallback(async (newConfig: AlarmConfig) => {
    if (newConfig.notificationId) await cancelNotification(newConfig.notificationId);
    let notificationId: string | undefined;
    if (newConfig.enabled) notificationId = await scheduleAlarmNotification(newConfig);
    const updated = { ...newConfig, notificationId };
    await AsyncStorage.setItem(ALARM_KEY, JSON.stringify(updated));
    setConfigState(updated);
  }, []);

  const triggerAlarm = useCallback(() => {
    setIsRinging(true);
    startHapticAlarm();
    startAlarmSound(config?.ringtoneUri);
  }, [config]);

  const stopAlarm = useCallback(() => {
    setIsRinging(false);
    stopHapticAlarm();
    stopAlarmSound();
  }, []);

  const getChallenge = useCallback(() => {
    if (!config) return CHALLENGES[0];
    return CHALLENGES.find((c) => c.id === config.challengeId) ?? CHALLENGES[0];
  }, [config]);

  return (
    <AlarmContext.Provider value={{ config, isRinging, setConfig, triggerAlarm, stopAlarm, getChallenge }}>
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error("useAlarm must be used within AlarmProvider");
  return ctx;
}
