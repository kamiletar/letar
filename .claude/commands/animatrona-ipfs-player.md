---
description: Воркфлоу разработки Animatrona IPFS Player — облегчённый десктоп-клиент для просмотра IPFS-раздач аниме по CID, без импорта и кодирования
---

# Animatrona IPFS Player - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `.claude/rules/electron.md` для граблей Electron-приложений
3. Прочитай `apps/animatrona-ipfs-player/PLAN.md` для текущего состояния задач и решений владельца
   по объёму (⚠️ объём финально урезан до «только просмотр» — не путать с более ранними
   формулировками внутри самого файла, там сохранена историческая последовательность решений)

## Регистрация в Agent Mail

Фиксированное имя агента: `animatrona-ipfs-player-dev`. Общий шаблон вызова
`macro_start_session` — см. `.claude/rules/app-workflow.md`.

⚠️ **Токен ещё не заведён в `agent_fixed_names_tokens.md`** (приложение только что создано,
2026-09-08) — первая сессия должна зарегистрировать identity без `registration_token`
(`macro_start_session`/`register_agent` с одним `agent_name: "animatrona-ipfs-player-dev"`),
затем сохранить выданный `registration_token` в память (`agent_fixed_names_tokens.md`), как у
всех остальных приложений. Не путать с `animatrona-dev` (десктоп с транскодированием/IPFS) и
`animatrona-folder-player-dev` (плеер локальных папок, без IPFS) — три разные identity.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "animatrona", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.
(В studio отдельного проекта под IPFS Player не заведено — время идёт по общему проекту
`animatrona`, как и у `animatrona-folder-player`.)

## Действия

После изучения документации:

- Определи текущую фазу разработки (см. `PLAN.md` — сейчас «Открытые вопросы» и Фаза 1 MVP)
- Выбери следующую задачу из плана
- Предложи план действий

## Особенности проекта

- **Только просмотр — жёсткое ограничение объёма (решение владельца, 2026-09-08).** Добавить
  трекер в список, посмотреть раздачу по `directoryCid` — и всё. Никаких подписок с
  авто-обновлением, discover-ленты, федерации с ключами/доверием/хаб-ролью, скачивания
  торрентов, публикации, редактирования watch-статуса на удалённых серверах. Прежде чем
  добавлять любую фичу за пределами этого — сверься с PLAN.md § «Решено с владельцем» и
  переспроси, если не уверен, что именно эта фича входит в согласованный объём.
- **Полный узел Kubo** (не HTTP-gateway) — участвует в раздаче (сидирует), запускается через
  будущую `libs/ipfs-kubo-core` (общая с `animatrona`, план переноса — см. PLAN.md § «Открытые
  вопросы»). Не копировать код IPFS/Kubo-сервисов из `apps/animatrona` напрямую — сначала
  выносится SHARED-часть в либу, только потом IPFS Player заводится на готовую либу.
- **Без ffmpeg И без ffprobe** — все метаданные дорожек уже в IPFS-манифесте (`manifest.json`),
  подтверждено разбором кода 2026-09-08 (см. PLAN.md). Не добавляй эти зависимости без явного
  пересмотра решения.
- **Prisma/SQLite нужен, но сильно урезанный** относительно `animatrona` — минимальная схема
  под объём «только просмотр» (`Tracker`, локальный кэш раздачи по CID, урезанный `Settings`,
  `PinStatus`/аналог) ещё не спроектирована, это первый пункт «Открытых вопросов» в PLAN.md.
- **Изолировано от экосистемы Animatrona на уровне кода**, но НЕ архитектурно — общий код
  переиспользуется через `libs/ipfs-kubo-core`, не копипастится. Не импортирует
  `@letar/animatrona-types` (нет своей библиотеки на публикацию — нечего типизировать).

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Координация (Animatrona Coordinator)

**После каждого значимого изменения** уведоми координатора:

```
send_message(to: ["animatrona-coordinator-dev"], subject: "change: <описание>", topic: "animatrona-change",
  body_md: "app: animatrona-ipfs-player\ntype: <type-change|ui-change|ipfs-change>\nfiles: <затронутые файлы>\ndescription: <что изменилось>\nbreaking: true/false")
```

Также **проверяй inbox** на задачи от координатора (topic: `animatrona-task`) — в первую очередь
про перенос кода в `libs/ipfs-kubo-core` и синхронизацию с изменениями в `apps/animatrona`,
которые затрагивают SHARED-часть IPFS/Kubo-сервисов (`kubo-service.ts`, `kubo-daemon.ts`,
`peer-sync-service.ts`, `pin-manager.ts`).

**⚠️ НЕ правь код** в `animatrona`, `animatrona-folder-player`, `animatrona-tracker`,
`animatrona-mobile`, `animatrona-tv` — только уведомляй координатора.

## Деплой

Не применимо — Electron desktop-приложение без продакшен-сервера. Сборка дистрибутива:
`nx build:win animatrona-ipfs-player`.

## Проект

**Приложение:** animatrona-ipfs-player (Electron + Next.js, Nextron)
**Продуктовое имя:** «Animatrona IPFS Player» — Standard-продукт в линейке K-Lite-подобной
триады (`animatrona-folder-player` — Lite, `animatrona-ipfs-player` — Standard, `animatrona` —
Mega)
**Описание:** Просмотр IPFS-раздач аниме по CID — без импорта, кодирования и публикации
