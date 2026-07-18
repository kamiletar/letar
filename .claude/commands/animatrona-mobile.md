# Animatrona Mobile - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/animatrona-mobile/README.md` для обзора приложения
2. Прочитай `apps/animatrona-mobile/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `animatrona-mobile-dev`.
Токен — в памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  agent_name: "animatrona-mobile-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка animatrona-mobile: <что делаешь>",
  file_reservation_paths: ["apps/animatrona-mobile/**"],
  file_reservation_reason: "animatrona-mobile development"
)
```

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## Координация (Animatrona Coordinator)

**После каждого значимого изменения** уведоми координатора:

```
send_message(to: ["GrayMill"], subject: "change: <описание>", topic: "animatrona-change",
  body_md: "app: animatrona-mobile\ntype: <type-change|ui-change>\nfiles: <затронутые файлы>\ndescription: <что изменилось>\nbreaking: true/false")
```

Также **проверяй inbox** на задачи от координатора (topic: `animatrona-task`).

**⚠️ НЕ правь код** в `animatrona`, `animatrona-web`, `animatrona-tracker`, `animatrona-tv` — только уведомляй координатора.

## После завершения задачи

1. Обнови `PLAN.md` — отметь задачу как выполненную
2. Обнови `PLAN_COMPLETED.md` — добавь детали реализации
3. Обнови `CHANGELOG.md` — добавь запись об изменениях
4. Обнови `PLAN_TESTING.md` — если добавил тесты
5. Обнови `package.json` — увеличь версию (semver)

## Проект

**Приложение:** animatrona-mobile (React Native)
**Платформа:** Android (Min SDK 24)
**Описание:** Мобильный плеер для просмотра аниме из библиотеки Animatrona Desktop

## Технологии

- React Native 0.80
- Tamagui (UI)
- React Navigation 7
- react-native-video (ExoPlayer)
- Zustand (state management)
- libass (ASS субтитры через JNI)

## Команды разработки

```bash
# Metro bundler (порт 8082 из-за конфликта с IPFS)
npx react-native start --port 8082

# ADB reverse для устройства
adb reverse tcp:8081 tcp:8082

# Сборка и установка
cd apps/animatrona-mobile/android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Логи
adb logcat -s ReactNativeJS:* SyncVideoView:*
```

## Особенности

- Metro bundler на порту 8082 (8081 занят IPFS/kubo)
- Нативные модули: exoplayer-ass, exoplayer-sync
- Жесты: PanResponder для touch handling
