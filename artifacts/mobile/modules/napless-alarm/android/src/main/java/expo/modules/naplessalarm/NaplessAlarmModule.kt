package expo.modules.naplessalarm

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NaplessAlarmModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NaplessAlarm")

    AsyncFunction("scheduleAlarm") { alarmId: String, timestamp: Double, ringtoneUri: String?, repeatMode: String, weekdays: List<Int>, monthDays: List<Int>, dates: List<String> ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("Android context is unavailable")
      AlarmScheduler.schedule(context, alarmId, timestamp.toLong(), ringtoneUri, repeatMode, weekdays, monthDays, dates)
    }

    AsyncFunction("cancelAlarm") { alarmId: String? ->
      appContext.reactContext?.let { AlarmScheduler.cancel(it, alarmId) }
    }

    AsyncFunction("stopAlarm") {
      appContext.reactContext?.let(AlarmPlaybackService::stop)
    }

    AsyncFunction("getRingingAlarmId") {
      val context: Context = appContext.reactContext
        ?: throw IllegalStateException("Android context is unavailable")
      AlarmPlaybackService.getRingingAlarmId(context)
    }
  }
}