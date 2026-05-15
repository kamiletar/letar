plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.letar.exoplayer.sync"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // React Native
    implementation("com.facebook.react:react-android:+")

    // ExoPlayer / Media3
    implementation("androidx.media3:media3-exoplayer:1.5.1")
    implementation("androidx.media3:media3-ui:1.5.1")
    implementation("androidx.media3:media3-common:1.5.1")
    implementation("androidx.media3:media3-datasource:1.5.1")

    // AndroidX
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.annotation:annotation:1.9.1")
}
