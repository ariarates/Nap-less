import { requireOptionalNativeModule } from "expo";

interface NaplessAlarmModule {
  scheduleAlarm(
    alarmId: string,
    timestamp: number,
    ringtoneUri: string,
    repeatMode: string,
    weekdays: number[],
    monthDays: number[],
    dates: string[]
  ): Promise<void>;
  cancelAlarm(alarmId?: string): Promise<void>;
  stopAlarm(): Promise<void>;
  getRingingAlarmId(): Promise<string | null>;
}

const nativeModule = requireOptionalNativeModule<NaplessAlarmModule>("NaplessAlarm");

export default nativeModule ?? {
  scheduleAlarm: async () => undefined,
  cancelAlarm: async () => undefined,
  stopAlarm: async () => undefined,
  getRingingAlarmId: async () => null,
};