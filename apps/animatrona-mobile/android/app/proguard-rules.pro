# React Native — сохранить TurboModules и Fabric Components
-keep class com.letar.animatrona.mobile.** { *; }
-keep class com.facebook.react.** { *; }

# Hermes
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# ExoPlayer
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# JNI (libass)
-keepclasseswithmembers class * {
    native <methods>;
}
