package expo.modules.naplessalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import java.util.Calendar
import java.util.Locale

internal object AlarmScheduler {
  private const val PREFS = "napless_native_alarm"
  private const val KEY_IDS = "alarm_ids"
  private const val LEGACY_ENABLED = "enabled"
  private const val LEGACY_TIME = "time"
  private const val LEGACY_RINGTONE = "ringtone"
  const val EXTRA_RINGTONE = "ringtone_uri"
  const val EXTRA_ALARM_ID = "alarm_id"

  fun schedule(
    context: Context,
    alarmId: String,
    timestamp: Long,
    ringtoneUri: String?,
    repeatMode: String,
    weekdays: List<Int>,
    monthDays: List<Int>,
    dates: List<String>
  ) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val ids = prefs.getStringSet(KEY_IDS, emptySet()).orEmpty().toMutableSet()
    ids.add(alarmId)
    prefs.edit()
      .putStringSet(KEY_IDS, ids)
      .putBoolean(key(alarmId, "enabled"), true)
      .putLong(key(alarmId, "time"), timestamp)
      .putString(key(alarmId, "ringtone"), ringtoneUri)
      .putString(key(alarmId, "repeat"), repeatMode)
      .putStringSet(key(alarmId, "weekdays"), weekdays.map(Int::toString).toSet())
      .putStringSet(key(alarmId, "month_days"), monthDays.map(Int::toString).toSet())
      .putStringSet(key(alarmId, "dates"), dates.toSet())
      .apply()
    schedulePendingIntent(context, alarmId, timestamp, ringtoneUri)
  }

  fun cancel(context: Context, alarmId: String?) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (alarmId == null) {
      alarmManager.cancel(legacyAlarmIntent(context))
      prefs.edit().remove(LEGACY_ENABLED).remove(LEGACY_TIME).remove(LEGACY_RINGTONE).apply()
      return
    }
    alarmManager.cancel(alarmIntent(context, alarmId))
    val ids = prefs.getStringSet(KEY_IDS, emptySet()).orEmpty().toMutableSet()
    ids.remove(alarmId)
    prefs.edit().putStringSet(KEY_IDS, ids).remove(key(alarmId, "enabled"))
      .remove(key(alarmId, "time")).remove(key(alarmId, "ringtone"))
      .remove(key(alarmId, "repeat")).remove(key(alarmId, "weekdays"))
      .remove(key(alarmId, "month_days")).remove(key(alarmId, "dates")).apply()
  }

  fun scheduleNextOccurrence(context: Context, alarmId: String) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (!prefs.getBoolean(key(alarmId, "enabled"), false)) return
    val previous = prefs.getLong(key(alarmId, "time"), 0L)
    val next = nextOccurrence(prefs, alarmId, previous, System.currentTimeMillis())
    if (next == null) {
      cancel(context, alarmId)
      return
    }
    prefs.edit().putLong(key(alarmId, "time"), next).apply()
    schedulePendingIntent(context, alarmId, next, prefs.getString(key(alarmId, "ringtone"), null))
  }

  fun restoreAfterBoot(context: Context) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    prefs.getStringSet(KEY_IDS, emptySet()).orEmpty().toList().forEach { alarmId ->
      if (!prefs.getBoolean(key(alarmId, "enabled"), false)) return@forEach
      val previous = prefs.getLong(key(alarmId, "time"), 0L)
      val next = nextOccurrence(prefs, alarmId, previous, System.currentTimeMillis() - 60_000L)
      if (next == null) {
        cancel(context, alarmId)
      } else {
        prefs.edit().putLong(key(alarmId, "time"), next).apply()
        schedulePendingIntent(context, alarmId, next, prefs.getString(key(alarmId, "ringtone"), null))
      }
    }
  }

  private fun nextOccurrence(prefs: android.content.SharedPreferences, alarmId: String, previous: Long, after: Long): Long? {
    if (previous <= 0L) return null
    val previousCalendar = Calendar.getInstance().apply { timeInMillis = previous }
    val hour = previousCalendar.get(Calendar.HOUR_OF_DAY)
    val minute = previousCalendar.get(Calendar.MINUTE)
    val repeatMode = prefs.getString(key(alarmId, "repeat"), "daily") ?: "daily"
    val weekdays = prefs.getStringSet(key(alarmId, "weekdays"), emptySet()).orEmpty().mapNotNull(String::toIntOrNull).toSet()
    val monthDays = prefs.getStringSet(key(alarmId, "month_days"), emptySet()).orEmpty().mapNotNull(String::toIntOrNull).toSet()
    val dates = prefs.getStringSet(key(alarmId, "dates"), emptySet()).orEmpty()
    val candidate = Calendar.getInstance().apply {
      timeInMillis = after
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    repeat(370) { offset ->
      val day = (candidate.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, offset) }
      if (day.timeInMillis <= after) return@repeat
      val matches = when (repeatMode) {
        "weekdays" -> (day.get(Calendar.DAY_OF_WEEK) - 1) in weekdays
        "monthly" -> day.get(Calendar.DAY_OF_MONTH) in monthDays
        "dates" -> String.format(Locale.US, "%04d-%02d-%02d", day.get(Calendar.YEAR), day.get(Calendar.MONTH) + 1, day.get(Calendar.DAY_OF_MONTH)) in dates
        else -> true
      }
      if (matches) return day.timeInMillis
    }
    return null
  }

  private fun schedulePendingIntent(context: Context, alarmId: String, timestamp: Long, ringtoneUri: String?) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val operation = alarmIntent(context, alarmId, ringtoneUri)
    val showIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
      PendingIntent.getActivity(
        context,
        requestCode(alarmId) + 1,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag()
      )
    }
    alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(timestamp, showIntent), operation)
  }

  private fun alarmIntent(context: Context, alarmId: String, ringtoneUri: String? = null): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java)
      .setData(Uri.parse("napless://alarm/$alarmId"))
      .putExtra(EXTRA_ALARM_ID, alarmId)
      .putExtra(EXTRA_RINGTONE, ringtoneUri)
    return PendingIntent.getBroadcast(
      context,
      requestCode(alarmId),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag()
    )
  }

  private fun legacyAlarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
    context,
    64021,
    Intent(context, AlarmReceiver::class.java),
    PendingIntent.FLAG_NO_CREATE or immutableFlag()
  ) ?: PendingIntent.getBroadcast(context, 64021, Intent(context, AlarmReceiver::class.java), PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag())

  private fun requestCode(alarmId: String) = 64022 + (alarmId.hashCode() and 0x00FFFFFF)
  private fun key(alarmId: String, field: String) = "alarm_${alarmId}_$field"

  private fun immutableFlag() =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
}