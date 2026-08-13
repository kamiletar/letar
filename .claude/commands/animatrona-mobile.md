---
description: Воркфлоу разработки мобильного плеера Animatrona (React Native, Android)
---

# Animatrona Mobile - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/animatrona-mobile/README.md` для обзора приложения
2. Прочитай `apps/animatrona-mobile/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

Фиксированное имя агента: `animatrona-mobile-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "animatrona-mobile", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

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

Общий чек-лист — `.claude/rules/app-workflow.md`.

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
