# Proguard rules for exoplayer-sync

# Keep ExoPlayer classes
-keep class androidx.media3.** { *; }
-keep interface androidx.media3.** { *; }

# Keep native module classes
-keep class com.lena.exoplayer.sync.** { *; }
