---
description: Воркфлоу разработки TV-плеера Animatrona (React Native, Android TV)
---

# Animatrona TV - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/animatrona-tv/README.md` для обзора приложения
2. Прочитай `apps/animatrona-tv/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

Фиксированное имя агента: `animatrona-tv-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "animatrona-tv", ... })` — общий шаблон и правила
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
  body_md: "app: animatrona-tv\ntype: <type-change|ui-change>\nfiles: <затронутые файлы>\ndescription: <что изменилось>\nbreaking: true/false")
```

Также **проверяй inbox** на задачи от координатора (topic: `animatrona-task`).

**⚠️ НЕ правь код** в `animatrona`, `animatrona-web`, `animatrona-tracker`, `animatrona-mobile` — только уведомляй координатора.

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** animatrona-tv (React Native)
**Платформа:** Android TV (Min SDK 24)
**Описание:** TV плеер для просмотра аниме из библиотеки Animatrona Desktop

## Технологии

- React Native 0.80
- React Navigation 7
- ExoPlayer (через @letar/exoplayer-sync)
- Zustand (state management)
- AsyncStorage (прогресс просмотра)

## Команды разработки

```bash
# Metro bundler
nx start animatrona-tv

# Сборка и установка debug APK
nx android animatrona-tv

# Или отдельно:
nx build-android animatrona-tv
adb install -r apps/animatrona-tv/android/app/build/outputs/apk/debug/app-debug.apk

# Релизная сборка
nx build-android-release animatrona-tv
```

## Особенности

- Навигация D-Pad / пультом (не touch)
- Leanback-стиль интерфейса для TV
- Синхронизированное воспроизведение видео + внешнего аудио
- API клиент переиспользован из animatrona-mobile
