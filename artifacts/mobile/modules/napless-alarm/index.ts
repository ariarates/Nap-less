import { requireNativeModule } from "expo-modules-core";

interface NaplessAlarmModule {
  scheduleAlarm(timestamp: number, ringtoneUri: string): Promise<void>;
  cancelAlarm(): Promise<void>;
  stopAlarm(): Promise<void>;
  isRinging(): Promise<boolean>;
}

export default requireNativeModule<NaplessAlarmModule>("NaplessAlarm");