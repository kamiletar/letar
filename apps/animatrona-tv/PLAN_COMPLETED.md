# Выполненные задачи

Детальное описание всех реализованных фич Animatrona TV.

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
