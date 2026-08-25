# Android/Windows: AGP 9 built-in Kotlin и ninja long-path — две ловушки одной сборки

⚠️ Найдено в сессии `animatrona-mobile-dev` (2026-08-25) при апгрейде react-native до 0.87.0 на
Android — обе не связаны с самим RN, это ловушки уровня Gradle/AGP 9 и Windows-тулчейна. Актуально
для любого RN/Android-приложения монорепо, собираемого на Windows под AGP 9.0+, не только
animatrona-mobile.

## 1. AGP 9.0+ built-in Kotlin конфликтует с явным `org.jetbrains.kotlin.android`

**Симптом:**

```
IllegalArgumentException: Cannot add extension with name 'kotlin', as there is an extension
already registered with that name
```

Возникает при `apply plugin: 'org.jetbrains.kotlin.android'` в модуле, где уже применён
`com.android.application`/`com.android.library` под AGP 9.0+.

**Причина:** AGP 9.0+ несёт встроенную поддержку Kotlin и сам регистрирует extension `kotlin` —
явное применение kotlin-android plugin регистрирует его повторно и падает.

**Временный обход (официальный, до AGP 10 — https://kotl.in/gradle/agp-built-in-kotlin):**

```properties
# gradle.properties модуля
android.builtInKotlin=false
android.newDsl=false
```

⚠️ При этом сочетании старый API `kotlinOptions { jvmTarget = "..." }` в `.gradle.kts`-скриптах
даёт **compile-time ERROR**, не warning — мигрировать на новый API:

```kotlin
// ❌ было
kotlinOptions {
    jvmTarget = "17"
}

// ✅ стало
kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}
```

**Долгосрочное решение** — полная миграция на `android.builtInKotlin=true`
(https://developer.android.com/build/migrate-to-built-in-kotlin), когда экосистема
react-native-gradle-plugin и autolinking library modules её поддержат. Пока не поддерживают —
обход выше остаётся рабочим вариантом.

## 2. Windows: старый `ninja.exe` из NDK-тулчейна не поддерживает длинные пути

**Симптом:**

```
ninja: error: Stat(...): Filename longer than 260 characters
```

При cmake/ninja-сборке нативных модулей — особенно у Fabric codegen, который генерирует
relative-пути, зеркалящие полный путь исходника, и потому особенно длинные.

**Ловушка:** системный `HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled=1` **не
помогает** — выглядит как решение (стандартный фикс для длинных путей на Windows), но
`ninja.exe`, идущий в комплекте с cmake 3.22.1 из Android SDK, не имеет манифеста
`longPathAware` и лимит 260 символов игнорирует системную настройку.

**Рабочий обход** — смонтировать репозиторий на короткую букву диска и собирать оттуда:

```powershell
subst X: C:\web\letar
```

(требует прав; PowerShell/cmd)

```bash
cd X:\apps\<app>\android
./gradlew assembleDebug
```

**Почему это будет всплывать снова:** `letar` лежит достаточно глубоко
(`C:\web\letar\apps\<app>\...`), и с ростом длины относительных путей внутри `node_modules`
(особенно у codegen'а gesture-handler/exoplayer-либ и подобных) лимит выбирается быстро — актуально
для любого RN-приложения монорепо с нативными Fabric-компонентами, не только animatrona-mobile.
