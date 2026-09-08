# Выполненные задачи

Детальное описание всех реализованных фич Animatrona TV.

## Версия 0.6.2 (2026-09-08)

### Фикс: `nx lint animatrona-tv` не существовал в графе Nx вообще

Блок `lint` в `project.json` выглядел настроенным (`options.args: ["**/*.{ts,tsx}"]`), но был
без `executor` — классическая ловушка `.claude/docs/nx-target-without-executor-silent-noop.md`.
`@nx/eslint/plugin` не порождает inferred-таргет `lint` там, где нет `eslint.config.*`, а такого
файла у tv не было. Практическое следствие: обязательный шаг чек-листа «перед коммитом
`nx lint <app>`» на этом приложении молча не проверял ничего — судя по всему, с самого создания.

Обнаружено параллельно двумя сторонами: я упёрлась независимо, `animatrona-mobile-dev`
одновременно получила задачу «завести `eslint.config.mjs` для RN-приложений (и согласовать
tv)». Скоординировались через Agent Mail (тред `rn-eslint-config`) вместо дублирования работы:
она отдала готовую, уже отлаженную форму конфига, я применила дословно.

- `apps/animatrona-tv/eslint.config.mjs` — три обхода несовместимости ESLint 10, найденные
  mobile-dev: `@react-native/eslint-config/flat` целиком не грузится
  (`eslint-plugin-eslint-comments@3.2.0` падает на `context.getSourceCode is not a function`),
  та же несовместимость у `eslint-plugin-react-native@5.0.0` (значит `no-unused-styles`/
  `no-inline-styles`/`split-platform-components` пока недоступны — долг, не наша правка чинит),
  `@react-native/eslint-plugin` резолвится через `createRequire` от entry-файла
  `@react-native/eslint-config/flat` (транзитивная зависимость, изолированная установка bun её
  не видит напрямую)
- `project.json`: мёртвый блок `lint` заменён на связку `oxlint` (executor `nx:run-commands`) +
  `lint: dependsOn: [oxlint]`, по образцу `animatrona-tracker`
- Первый реальный прогон по всем 32 файлам (проверено через `eslint . -f json`, не по
  «Successfully ran target» — mobile-dev предупредила именно об этой ловушке) нашёл 4 находки:
  `no-console` в `index.js` (осознанный паттерн версионирования JS bundle, тот же что в mobile —
  оставлен), 3× `react-hooks/exhaustive-deps` в `TVPlayerScreen.tsx` — `setError`/
  `setSelectedAudio`/`setSelectedSubtitle` приходят не из локального `useState`, а из кастомного
  хука `usePlayerEpisode`; статический анализ не может доказать стабильность через границу
  хука (в отличие от прямого `useState`, где React это гарантирует). Добавлены в зависимости
  `useCallback` — правки безопасны, паттерн на практике стабилен, просто раньше не был явным

### Фикс: экран уходил в скринсейвер во время просмотра

`WAKE_LOCK` был объявлен в `AndroidManifest.xml`, но ничего его не использовало — на TV D-pad
трогают редко (не тач-экран как на mobile), системный скринсейвер срабатывал посреди серии.

Фикс — `WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON` на `MainActivity.onCreate()`, держится
весь activity lifecycle, а не только на экране плеера. Осознанное отличие от `useWakeLock` в
`animatrona-mobile` (TurboModule, включается только на время воспроизведения): TV всегда от
розетки, батарею жалеть незачем, поэтому не нужен ни TurboModule (инфраструктуры TurboModule в
tv нет вообще, в отличие от mobile), ни JS-мост — двух строк в `MainActivity.kt` достаточно.
Заодно убран сам `WAKE_LOCK` permission из манифеста — был объявлен под несуществующий
`PowerManager.WakeLock`, вводил в заблуждение.

Проверено: `nx typecheck:tsgo` зелёный, `nx build-android` — BUILD SUCCESSFUL (нативная часть
пересобрана).

### Фикс: убраны локальные пины `react-native`/`@react-native/*`

Найдено `animatrona-mobile-dev`, подтверждено координатором: `react-native`/
`@react-native/codegen`/`@react-native/gradle-plugin` в `package.json` были запинены на
`0.87.0`, при корневых уже `0.87.1` — тот же класс дрейфа версий, что раньше был у `react`
(19.2.3/19.2.8, см. версия 0.5.0 ниже). Версии заменены на `"*"` (паттерн
`@letar/animatrona-shared`) — резолв только через hoisting из корня.

Проверено: `bun install` из корня схлопнул tv на `react-native@0.87.1` (отдельная запись для tv
исчезла из `bun.lock`), `nx typecheck:tsgo` зелёный, `nx build-android` — BUILD SUCCESSFUL.

## Версия 0.6.0

### Фикс: Android toolchain под RN 0.87 (перенос из animatrona-mobile)

`animatrona-mobile-dev` при попытке собрать и запустить приложение на реальном устройстве под
RN 0.87 нашла класс несовместимостей Android toolchain, которые не ловятся typecheck'ом. У
`animatrona-tv` на момент проверки был тот же `gradle-wrapper.properties` на Gradle 8.13 и общие
с mobile либы `libs/exoplayer-ass`/`libs/exoplayer-sync` — фиксы применены и здесь:

- `gradle-wrapper.properties`: Gradle 8.13 → 9.4.1 — AGP, который требует RN 0.87, минимум 9.4.1
- `android/build.gradle`: `com.android.tools.build:gradle` 8.7.3 → 9.2.1, `kotlinVersion`
  2.1.20 → 2.2.0
- `android/gradle.properties`: добавлены `android.builtInKotlin=false` и `android.newDsl=false`.
  Без флагов сборка падает на «Cannot add extension with name 'kotlin'» — AGP 9.0+ включает
  built-in Kotlin support, который конфликтует с явным плагином `org.jetbrains.kotlin.android`,
  применённым в `:app` и в `exoplayer-ass`/`exoplayer-sync`. Флаг официальный, временный —
  уберут в AGP 10, тогда придётся снимать `org.jetbrains.kotlin.android` со всех трёх модулей
- `metro.config.js`: старый `resolveRequest` для singleton-пакетов (`react`, `react-native`)
  резолвил через `require.resolve(moduleName, { paths: [projectRoot] })` — под RN 0.87 падает
  (`ERR_PACKAGE_PATH_NOT_EXPORTED`) на глубоких внутренних импортах вида
  `react-native/src/private/featureflags/ReactNativeFeatureFlags`, которых нет в `exports`
  пакета. Перенесён фикс из `animatrona-mobile`: вместо строгого Node-резолва подменяется
  `originModulePath` на несуществующий якорный путь `node_modules/.singleton-anchor.js` —
  файл реально не нужен, важна только директория, дальше резолв идёт через собственный
  (нестрогий) резолвер Metro. Список перехватываемых пакетов расширен под фактические
  зависимости tv: `react-native-safe-area-context`, `react-native-gesture-handler`,
  `react-native-screens`, `react-native-svg`, `react-native-video`,
  `@react-native-async-storage/async-storage` (все резолвятся из корневого `node_modules` через
  hoisting — своих версий в `apps/animatrona-tv/node_modules` нет).
  `react-native-reanimated` не используется в tv и не добавлен
- `react-native-gesture-handler`: локального пина в `apps/animatrona-tv/package.json` не было,
  корневой уже на nightly `3.3.0-nightly-20260824-5de6d2358` — синхронизация не потребовалась
- `android/local.properties` создан локально (`sdk.dir=C:\Android\Sdk`, в `.gitignore`)
- Debug APK собран успешно: `npx react-native bundle` (predev bundle, без warning блокирующий) +
  `./gradlew assembleDebug` — BUILD SUCCESSFUL за 4 мин 9 сек, 187 задач (122 выполнено, 65 из
  кеша). Сборка шла через `subst X: C:\web\letar` — без короткого пути `ninja` падает на
  `Filename longer than 260 characters`
- ⚠️ Установка и запуск на реальном Android TV устройстве не проверены — к сессии было
  подключено только `TECNO LI6` (обычный Android-телефон). Проверить перед следующим релизом:
  D-pad фокус, воспроизведение видео+аудио, субтитры — как и по нерешённому пункту из версии
  0.5.0 миграции RN 0.87

## Версия 0.5.3

### Рефакторинг: TVErrorScreen — общий компонент экрана ошибки

Паттерн «экран ошибки» (`View` с `centerContainer` + `Text` ошибки + одна-две кнопки через
`focusableStyle`, обычно с `hasTVPreferredFocus`) почти дословно повторялся в 4 местах:
`TVPlayerScreen.tsx` («Эпизод не найден» и «Видео недоступно» — идентичны, отличается только
текст), `TVHomeScreen.tsx` (заголовок «Ошибка» + кнопки «Повторить»/«Отключиться») и
`TVAnimeScreen.tsx` (кнопки «Повторить»/«Назад»). Стили `retryButton`/`retryButtonFocused`/
`retryButtonText`/`errorButtons` были идентичны во всех 4 местах.

- Добавлен `src/components/tv/TVErrorScreen.tsx` — по образцу `TVNextEpisodeOverlay.tsx`
  (самодостаточный компонент со своими стилями). Пропсы: `message`, необязательный `title`
  (показывает вторую, приглушённую цветом строку текста — только у `TVHomeScreen`),
  `backgroundColor` (экраны используют разный фон: `#000` у плеера, `#0a0a0a` у остальных),
  `onRetry`/`retryLabel` (кнопка с фокусом, если передан), `onSecondary`/`secondaryLabel`
  (вторая кнопка — «Назад» либо «Отключиться»; забирает фокус, если `onRetry` не передан)
- Заменены все 4 вхождения, из каждого экрана убраны теперь неиспользуемые стили
  (`errorText`/`errorButtons`/`retryButton`/`retryButtonFocused`/`retryButtonText`,
  у `TVHomeScreen` дополнительно `errorTitle` и неиспользуемый `centerContainer`)
- `nx typecheck:tsgo` зелёный (lint-таргета у приложения нет)

## Версия 0.5.2

### Рефакторинг: декомпозиция TVPlayerScreen

`TVPlayerScreen.tsx` вырос до 652 строк (~462 — тело одного компонента) и содержал несколько
логически независимых блоков: загрузка данных, resume-диалог, настройки эпизода, автоскрытие
контролов. Для сравнения соседние экраны (`TVAnimeScreen` 402, `TVSettingsScreen` 387,
`TVHomeScreen` 315 строк) заметно компактнее.

- Диалог «Продолжить просмотр?» вынесен в `src/components/tv/ResumeOverlay.tsx` — по образцу уже
  существующего `TVNextEpisodeOverlay.tsx` (самодостаточный компонент со своими стилями,
  коллбэки через пропсы)
- Загрузка аниме/эпизода и выбор дефолтных аудио/субтитр дорожек вынесены в хук
  `src/hooks/usePlayerEpisode.ts`
- Экран сократился до 550 строк (тело компонента — ~407)
- Настройки эпизода (кнопки выбора аудио/субтитров + `TVTrackSelector`) и автоскрытие контролов
  оставлены как есть — компактны и тесно завязаны на рендер плеера, разбиение ухудшило бы
  читаемость
- `nx typecheck:tsgo` зелёный (lint-таргета у приложения нет)

## Версия 0.5.1

### Рефакторинг: helper для focused-стиля Pressable

После миграции на RN 0.87 (версия 0.5.0) паттерн `({ focused }: TVPressableState) => [...]`
повторялся почти дословно в ~20 местах 9 файлов (`TVNextEpisodeOverlay`, `TVPlayerControls`,
`TVTrackSelector`, `TVAnimeScreen`, `TVConnectScreen`, `TVHomeScreen`, `TVPlayerScreen`,
`TVSettingsScreen`).

- Добавлен `focusableStyle(base, focusedStyle, after?)` — `src/utils/tvStyles.ts`. Возвращает
  готовый style-callback для `Pressable`; `after` — опциональный параметр для случаев, где
  порядок стилей важен (например `TVConnectScreen`, где `disabled`-стиль должен применяться
  строго после focused-стиля)
- Типизация через `ViewStyle`, а не через generic, унаследованный от типа конкретного
  `styles.X` — базовый и focused-стиль обычно имеют непересекающийся набор полей
  (`borderColor`/`transform` только у focused), структурная проверка по generic давала TS2345
- `TVPressableState` теперь импортируется только внутри самого helper'а, а не в каждом
  экране/компоненте
- `nx typecheck:tsgo` зелёный

## Версия 0.5.0

### Синхронизация react-native до 0.87.0

Каскадная задача координатора Animatrona (GrayMill, thread `cascade-rn-087-migration`):
`animatrona-mobile-dev` подняла общие либы `libs/exoplayer-ass`/`libs/exoplayer-sync` и корневой
пин `react-native` до `0.87.0`, `animatrona-tv` синхронизирована следом.

- Убран локальный пин `react` (`19.2.3`) из `package.json` — версии только в корне монорепо
  (решение владельца после находки дубля версий react в дереве зависимостей)
- `react-native`/`@react-native/codegen`/`@react-native/gradle-plugin`: `0.84.1` → `0.87.0`
- Мигрирован собственный код под breaking changes 0.87:
  - `StyleSheet.absoluteFillObject` → `StyleSheet.absoluteFill` (6 мест)
  - `TextInput` ref-тип `TextInput` → именованный `TextInputInstance`
  - `FlatList.ListFooterComponent`: `null` → `undefined` (RN 0.87 не принимает `null`)
  - `PressableStateCallbackType` в 0.87 стал `type` (был `interface`) — старая аугментация через
    declaration merging (`declare module 'react-native' { interface PressableStateCallbackType
    {...} }`) молча перестала работать. Заменена на локальный union-тип `TVPressableState =
    PressableStateCallbackType & { focused?: boolean }` (`focused` — опционально, иначе колбэк
    несовместим с сигнатурой `Pressable.style` контравариантно) с явной аннотацией параметра в
    каждом месте использования (`src/types/react-native.d.ts`)
- Заодно найден и исправлен блокирующий дубль в общих либах (не только для tv — общий для
  `animatrona-mobile`): `libs/exoplayer-ass`/`libs/exoplayer-sync` держали `@types/react: ^18.3.18`
  отдельно от корневого `^19.2.18`, что давало изолированную копию типов `react-native` в дереве
  bun и ошибку `TS2719` на `style`-пропе. Унифицировано до `^19.2.18`. Отдельно —
  `StyleSheet.flatten(...)` в типах RN 0.87 допускает возврат `null`, добавлен `?? undefined`
- `nx typecheck:tsgo` зелёный на `animatrona-tv` и `animatrona-mobile` (оба перепроверены)

⚠️ Тест на реальном Android TV устройстве не пройден — нет подключённого устройства в среде
сессии. Открытый пункт в `PLAN.md` перед следующим релизом.

## Версия 0.4.0

### Phase 6: Polish

- Экран настроек (TVSettingsScreen)
- Автоскрытие контролов плеера
- Error handling
- Тестирование на Android TV эмуляторе (AOSP TV API 36)

## Версия 0.3.0

### Улучшения фокус-стейтов

- Бордеры увеличены до 4px, цвет #fff для контраста
- Фоновые изменения при фокусе на всех интерактивных элементах
- Scale transforms увеличены (1.05→1.1, кнопки play до 1.2)
- Android elevation вместо iOS-only shadowColor
- TextInput фокус-стейт на ConnectScreen
- FlatList TV: windowSize/initialNumToRender, ItemSeparatorComponent
- TVRow: исправлен порядок хуков

## Версия 0.2.0

### Тестирование на эмуляторе и исправления

- Адаптивная иконка приложения (ic_launcher)
- Исправлены: SDK path, JDK path, тема AppCompat, Metro config для монорепо
- Полноценное тестирование всех экранов на AOSP TV API 36

## Версия 0.1.0

### Инициализация проекта

- React Native 0.80.3 для Android TV
- Экраны: Connect, Home, Anime, Player, Settings
- Интеграция SyncVideoPlayer (exoplayer-sync) и ASS субтитров (exoplayer-ass)
- D-Pad навигация с визуальным фокусом
- Выбор аудиодорожки и субтитров (TVTrackSelector)
- Сохранение прогресса просмотра (useWatchProgress)

---

**Последнее обновление:** 2026-03-02
