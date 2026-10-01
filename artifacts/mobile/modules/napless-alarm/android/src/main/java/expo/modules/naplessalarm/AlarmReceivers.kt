package expo.modules.naplessalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val alarmId = intent.getStringExtra(AlarmScheduler.EXTRA_ALARM_ID) ?: return
    val ringtoneUri = intent.getStringExtra(AlarmScheduler.EXTRA_RINGTONE)
    AlarmScheduler.scheduleNextOccurrence(context, alarmId)
    val serviceIntent = Intent(context, AlarmPlaybackService::class.java)
      .putExtra(AlarmScheduler.EXTRA_ALARM_ID, alarmId)
      .putExtra(AlarmScheduler.EXTRA_RINGTONE, ringtoneUri)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(serviceIntent)
    } else {
      context.startService(serviceIntent)
    }
  }
}

class AlarmBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      AlarmScheduler.restoreAfterBoot(context)
    }
  }
}

class AlarmStopReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    AlarmPlaybackService.stop(context)
  }
}