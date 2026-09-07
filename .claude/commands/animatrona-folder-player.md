---
description: Воркфлоу разработки Animatrona Folder Player — standalone-плеер аниме из локальной папки (Electron + Next.js), без ffmpeg/IPFS
---

# Animatrona Folder Player - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `.claude/rules/electron.md` для граблей Electron-приложений
3. Прочитай `apps/animatrona-folder-player/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

Фиксированное имя агента: `animatrona-folder-player-dev`. Общий шаблон вызова
`macro_start_session` — см. `.claude/rules/app-workflow.md`.

⚠️ До 2026-09-08 разработка этого приложения (тогда ещё `animatrona-player`) велась ошибочно от
identity `animatrona-dev` — той, что по конвенции `<роль>-dev` принадлежит десктопному
`animatrona`. Не путать: `animatrona-dev` — десктоп с транскодированием/IPFS,
`animatrona-folder-player-dev` — этот, изолированный, standalone-плеер папок.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "animatrona", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.
(В studio отдельного проекта под folder-player не заведено — время идёт по общему проекту
`animatrona`, как и раньше.)

## Действия

После изучения документации:

- Определи текущую фазу разработки (см. `PLAN.md` — сейчас Фаза 1, MVP)
- Выбери следующую задачу из плана
- Предложи план действий

## Особенности проекта

- **Без ffmpeg:** в отличие от `animatrona`, это приложение принципиально не тащит ffmpeg-бинарь —
  извлечение медиаданных через `mediainfo.js` (WASM), встроенных субтитров/шрифтов — через
  потоковый JS-парсер `matroska-subtitles`. Не добавляй ffmpeg-зависимость без явного решения
  сменить архитектуру.
- **Без импорта, без IPFS:** плеер работает только с локальной папкой на диске (выбор через
  диалог), никакой публикации/раздачи контента.
- **Плеер:** Shaka Player (тот же движок, что в `animatrona`/`animatrona-tracker`), субтитры
  ass/ssa — SubtitlesOctopus (libass-wasm), srt/vtt — нативный `<track>`.
- **Изолировано от экосистемы Animatrona:** не импортирует `@letar/animatrona-types`, не участвует
  в каскадах координатора (см. `animatrona-coordinator.md`) — уведомлять координатора всё равно
  стоит для видимости, но задач от него по каскаду ожидать не нужно.

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Координация (Animatrona Coordinator)

**После каждого значимого изменения** уведоми координатора (для видимости — каскада на другие
animatrona-приложения не бывает, см. выше):

```
send_message(to: ["animatrona-coordinator-dev"], subject: "change: <описание>", topic: "animatrona-change",
  body_md: "app: animatrona-folder-player\ntype: <type-change|ui-change>\nfiles: <затронутые файлы>\ndescription: <что изменилось>\nbreaking: true/false")
```

Также **проверяй inbox** на задачи от координатора (topic: `animatrona-task`) — маловероятны, но
не исключены (например при переименовании самого приложения, как в 2026-09-08).

**⚠️ НЕ правь код** в `animatrona`, `animatrona-tracker`, `animatrona-mobile`, `animatrona-tv` —
только уведомляй координатора.

## Деплой

Не применимо — Electron desktop-приложение без продакшен-сервера. Сборка дистрибутива:
`nx build:win animatrona-folder-player`.

## Проект

**Приложение:** animatrona-folder-player (Electron + Next.js, Nextron)
**Продуктовое имя:** «Animatrona Player» (`productName`/`shortcutName` в `electron-builder.yml`) —
отображаемое пользователю название, отдельное от внутреннего слага проекта
**Описание:** Плеер аниме из локальной папки — без импорта, IPFS и транскодирования
