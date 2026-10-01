package expo.modules.naplessalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder

class AlarmPlaybackService : Service() {
  private var player: MediaPlayer? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopSelf()
      return START_NOT_STICKY
    }

    createNotificationChannel()
    startForeground(NOTIFICATION_ID, buildNotification())
    val alarmId = intent?.getStringExtra(AlarmScheduler.EXTRA_ALARM_ID)
    setRingingAlarmId(this, alarmId)
    play(intent?.getStringExtra(AlarmScheduler.EXTRA_RINGTONE))
    return START_STICKY
  }

  override fun onDestroy() {
    releasePlayer()
    setRingingAlarmId(this, null)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun play(ringtoneUri: String?) {
    val fallback = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    val source = ringtoneUri?.let(Uri::parse) ?: fallback
    preparePlayer(source, fallback, source != fallback)
  }

  private fun preparePlayer(source: Uri, fallback: Uri, canFallback: Boolean) {
    releasePlayer()
    val nextPlayer = MediaPlayer()
    player = nextPlayer
    try {
      nextPlayer.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .build()
      )
      nextPlayer.isLooping = true
      nextPlayer.setOnPreparedListener { if (player === it) it.start() }
      nextPlayer.setOnErrorListener { failedPlayer, _, _ ->
        if (canFallback) preparePlayer(fallback, fallback, false)
        else failedPlayer.reset()
        true
      }
      nextPlayer.setDataSource(this, source)
      nextPlayer.prepareAsync()
    } catch (_: Exception) {
      if (canFallback) preparePlayer(fallback, fallback, false)
    }
  }

  private fun releasePlayer() {
    player?.let {
      it.setOnPreparedListener(null)
      it.setOnErrorListener(null)
      try { it.release() } catch (_: Exception) {}
    }
    player = null
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Nap-Less alarm playback",
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Shown while the alarm is playing"
      setSound(null, null)
    }
    getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
  }

  private fun buildNotification(): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = launchIntent?.let {
      PendingIntent.getActivity(this, 7201, it, PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag())
    }
    val stopIntent = PendingIntent.getBroadcast(
      this,
      7202,
      Intent(this, AlarmStopReceiver::class.java).putExtra(AlarmScheduler.EXTRA_ALARM_ID, "active"),
      PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag()
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    builder
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Nap-Less alarm is ringing")
      .setContentText("Tap Stop to silence the alarm")
      .setCategory(Notification.CATEGORY_ALARM)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .addAction(0, "Stop", stopIntent)
    if (contentIntent != null) builder.setContentIntent(contentIntent)
    return builder.build()
  }

  private fun immutableFlag() =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

  companion object {
    private const val ACTION_STOP = "expo.modules.naplessalarm.STOP_ALARM"
    private const val CHANNEL_ID = "napless_alarm_playback"
    private const val NOTIFICATION_ID = 64022
    private const val PREFS = "napless_native_alarm"
    private const val KEY_RINGING_ALARM_ID = "ringing_alarm_id"

    fun stop(context: Context) {
      context.stopService(Intent(context, AlarmPlaybackService::class.java))
      setRingingAlarmId(context, null)
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.cancel(NOTIFICATION_ID)
    }

    fun getRingingAlarmId(context: Context): String? =
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_RINGING_ALARM_ID, null)

    private fun setRingingAlarmId(context: Context, alarmId: String?) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        .putString(KEY_RINGING_ALARM_ID, alarmId)
        .apply()
    }
  }
}