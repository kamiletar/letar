# Animatrona TV — План разработки

## Описание

Android TV приложение для просмотра аниме с Desktop сервера Animatrona. Переиспользует API и бизнес-логику из animatrona-mobile, адаптируя UI для навигации D-Pad и пультом.

## Технологический стек

| Компонент  | Технология                          |
| ---------- | ----------------------------------- |
| Framework  | React Native 0.80.3                 |
| Видеоплеер | ExoPlayer через libs/exoplayer-sync |
| State      | Zustand                             |
| Навигация  | React Navigation                    |
| Хранилище  | AsyncStorage                        |

## Фазы реализации

### Phase 1: Инициализация ✅

- [x] Создать PLAN.md и README.md
- [x] Инициализировать React Native проект
- [x] Настроить project.json для Nx
- [x] Настроить AndroidManifest.xml с TV флагами
- [x] Подключить exoplayer-sync в settings.gradle

### Phase 2: API и State ✅

- [x] Скопировать src/api/ из animatrona-mobile
- [x] Скопировать src/store/connection.ts
- [x] Настроить path aliases в tsconfig

### Phase 3: TV навигация ✅

- [x] Создать TVNavigator с React Navigation
- [x] Создать TVConnectScreen (ввод URL сервера)
- [x] Настроить TV theme (увеличенные размеры)

### Phase 4: Библиотека ✅

- [x] Создать FocusableCard с D-pad фокусом
- [x] Создать TVRow (горизонтальный список)
- [x] Создать TVHomeScreen (Leanback-style ряды)
- [x] Создать TVAnimeScreen (детали + эпизоды)

### Phase 5: Плеер ✅

- [x] Интегрировать SyncVideoPlayer из exoplayer-sync
- [x] Создать TVPlayerControls с D-pad управлением
- [x] Обработка BackHandler для навигации
- [x] Интегрировать useWatchProgress
- [x] Добавить субтитры (ASS/SRT) через exoplayer-ass
- [x] Добавить выбор аудиодорожки и субтитров (TVTrackSelector)

### Phase 6: Polish ✅

- [x] Создать экран настроек (TVSettingsScreen)
- [x] Автоскрытие контролов
- [x] Error handling
- [x] Финализация документации
- [x] Тестирование на Android TV эмуляторе (AOSP TV API 36)

## Переиспользуемый код (из animatrona-mobile)

| Файл                            | Использование                  |
| ------------------------------- | ------------------------------ |
| `src/api/client.ts`             | 100% без изменений             |
| `src/api/types.ts`              | 100% без изменений             |
| `src/store/connection.ts`       | 100% без изменений             |
| `src/hooks/useWatchProgress.ts` | 100% без изменений             |
| `libs/exoplayer-sync/`          | Нативный модуль                |
| `libs/exoplayer-ass/`           | ASS субтитры (нативный модуль) |

## Ключевые отличия от Mobile

| Аспект      | Mobile              | TV                             |
| ----------- | ------------------- | ------------------------------ |
| Ввод        | Touch, свайпы       | D-Pad, пульт                   |
| Фокус       | Нет                 | Обязателен (визуальный)        |
| UI элементы | Мелкие              | Крупные (min 48dp)             |
| Ориентация  | Portrait/Landscape  | Landscape only                 |
| Layout      | Вертикальные списки | Горизонтальные ряды (Leanback) |

## Структура проекта

```
apps/animatrona-tv/
├── android/                    # Android TV конфигурация
│   ├── app/src/main/
│   │   └── AndroidManifest.xml # Leanback launcher
│   └── settings.gradle         # exoplayer-sync
├── src/
│   ├── api/                    # Копия из mobile
│   │   ├── client.ts
│   │   └── types.ts
│   ├── store/                  # Zustand (connection)
│   │   └── connection.ts
│   ├── hooks/
│   │   └── useWatchProgress.ts # Из mobile
│   ├── components/tv/          # TV-специфичные
│   │   ├── FocusableCard.tsx
│   │   ├── TVRow.tsx
│   │   ├── TVPlayerControls.tsx
│   │   └── TVTrackSelector.tsx  # Выбор аудио/субтитров
│   ├── navigation/
│   │   └── TVNavigator.tsx
│   └── screens/
│       ├── TVConnectScreen.tsx
│       ├── TVHomeScreen.tsx
│       ├── TVAnimeScreen.tsx
│       ├── TVPlayerScreen.tsx
│       └── TVSettingsScreen.tsx # Настройки приложения
├── project.json                # Nx конфигурация
├── package.json
├── tsconfig.json
├── PLAN.md
└── README.md
```

## TV-специфичные паттерны

### D-Pad навигация

```tsx
// Использование hasTVPreferredFocus для начального фокуса
<Pressable hasTVPreferredFocus={isFirst}>
```

### Визуальный фокус

```tsx
// Обязательная индикация фокуса
<Pressable
  style={({ focused }) => [
    styles.card,
    focused && styles.cardFocused,
  ]}
>

const styles = StyleSheet.create({
  cardFocused: {
    borderWidth: 4,
    borderColor: '#fff',
    transform: [{ scale: 1.05 }],
  },
})
```

### Leanback Layout

```tsx
// Горизонтальные ряды для TV
<ScrollView>
  <TVRow title="Продолжить просмотр" items={continueWatching} />
  <TVRow title="Недавно добавленные" items={recent} />
  <TVRow title="Все аниме" items={all} />
</ScrollView>
```

## Команды разработки

```bash
# Запуск Metro bundler (порт 8083 чтобы не конфликтовать с mobile)
nx start animatrona-tv

# Сборка debug APK
nx build-android animatrona-tv

# Установка на TV эмулятор
adb install -r apps/animatrona-tv/android/app/build/outputs/apk/debug/app-debug.apk

# Логи
adb logcat -s ReactNativeJS:* SyncVideoView:*

# Очистка
nx clean animatrona-tv
```

## Верификация

1. Запуск на Android TV эмуляторе: `nx android animatrona-tv`
2. D-pad навигация работает на всех экранах
3. Видео воспроизводится с синхронизацией аудио
4. Прогресс сохраняется между сессиями
5. Субтитры ASS/SRT отображаются корректно
6. Выбор аудиодорожки и субтитров работает
7. Экран настроек позволяет изменить сервер и отключиться

## TODO

- [x] Добавить поддержку субтитров (exoplayer-ass подключен)
- [x] Добавить выбор аудиодорожки в UI плеера (TVTrackSelector)
- [x] Добавить настройки (TVSettingsScreen с изменением сервера, отключением)
- [x] Улучшить фокус-стейты: толстые бордеры (4px), яркие цвета, elevation, scale transforms
- [ ] Тестирование на реальном Android TV устройстве

---

## Миграция RN 0.87 (2026-08-20)

Каскадная задача от координатора Animatrona (GrayMill, thread `cascade-rn-087-migration`):
`animatrona-mobile-dev` подняла общие либы `libs/exoplayer-ass`/`libs/exoplayer-sync` под
React Native 0.87, затем корневой пин — `animatrona-tv` синхронизирована следом.

- Убран локальный пин `react` (был `19.2.3`, отдельно от корневого `^19.2.8`)
- `react-native`/`@react-native/codegen`/`@react-native/gradle-plugin`: `0.84.1` → `0.87.0`
- Код мигрирован под breaking changes 0.87 (детали — CHANGELOG.md), typecheck зелёный
- ⚠️ Тест на реальном Android TV устройстве **не пройден** — среда сессии без подключённого TV.
  Обязательно проверить перед следующим релизом: D-pad фокус, тач на TextInput-полях,
  воспроизведение видео+аудио, субтитры.

### Рефакторинг фокус-стилей (2026-08-20)

Дублировавшийся паттерн `({ focused }: TVPressableState) => [...]` (~20 мест, 9 файлов) вынесен в
helper `focusableStyle(base, focusedStyle, after?)` — `src/utils/tvStyles.ts`. `TVPressableState`
теперь импортируется только внутри самого helper'а, а не в каждом экране/компоненте.

### Рефакторинг экрана ошибки (2026-08-20)

Дублировавшийся паттерн «экран ошибки» (4 места в `TVPlayerScreen`/`TVHomeScreen`/
`TVAnimeScreen`) вынесен в `components/tv/TVErrorScreen.tsx`. Подробности — PLAN_COMPLETED.md
версия 0.5.3.

**Обновлено:** 2026-08-20
