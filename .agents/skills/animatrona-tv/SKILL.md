---
name: animatrona-tv
description: Воркфлоу разработки TV-плеера Animatrona (React Native, Android TV)
disable-model-invocation: true
---

# Animatrona TV - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/animatrona-tv/README.md` для обзора приложения
2. ⚠️ **Очередь задач — `apps/animatrona-tv/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/animatrona-tv/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next animatrona-tv`. Вызов с id (`/animatrona-tv TV-003`) — сразу
   `bun scripts/tasks.mjs show TV-003`. `PLAN.md`, `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `animatrona-tv-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "animatrona-tv", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start TV-NNN --owner animatrona-tv-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new animatrona-tv …`, не абзацем в плане

## Координация (Animatrona Coordinator)

**После каждого значимого изменения** уведоми координатора:

```
send_message(to: ["animatrona-coordinator-dev"], subject: "change: <описание>", topic: "animatrona-change",
  body_md: "app: animatrona-tv\ntype: <type-change|ui-change>\nfiles: <затронутые файлы>\ndescription: <что изменилось>\nbreaking: true/false")
```

Также **проверяй inbox** на задачи от координатора (topic: `animatrona-task`).

**⚠️ НЕ правь код** в `animatrona`, `animatrona-tracker`, `animatrona-mobile` — только уведомляй координатора.
(`animatrona-web` выведен из эксплуатации, папки не существует — см. навык `animatrona-coordinator`.)

## После завершения задачи

`bun scripts/tasks.mjs done TV-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** animatrona-tv (React Native)
**Платформа:** Android TV (Min SDK 24)
**Описание:** TV плеер для просмотра аниме из библиотеки Animatrona Desktop

## Технологии

- React Native 0.87
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
