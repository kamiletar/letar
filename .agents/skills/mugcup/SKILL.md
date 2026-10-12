---
name: mugcup
description: Воркфлоу разработки mugcup — сервис проведения и судейства творческих соревнований, регистрация в Agent Mail
disable-model-invocation: true
---

# Mug Cup - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. ⚠️ **Очередь задач — `apps/mugcup/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/mugcup/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next mugcup`. Вызов с id (`/mugcup MC-001`) — сразу
   `bun scripts/tasks.mjs show MC-001`. `PLAN*.md` **заморожены** и остаются справкой: целиком их
   не читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)
   (ТЗ и принятые решения — в `PLAN.md` разделы «ТЗ» и «Принятые решения», только по `grep -n`)

## Регистрация в Agent Mail

Фиксированное имя агента: `mugcup-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Проект внутренний (в studio помечен некоммерческим): время учитывается небиллируемым само.
Сразу стартуй таймер `time_start({ app: "mugcup", ... })` — правила переключения и остановки
см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start MC-NNN --owner mugcup-dev`
- План работы запиши в раздел «План» файла задачи и покажи до кода
- Находку вне задачи заводи через `tasks new mugcup …`, не абзацем в плане

## Что важно помнить

- Артисты и команды общие на сервис; организатору принадлежат только конкурсы.
- Правила конкурса — данные (`Ruleset.config`, схема в `src/lib/rules/`), не код. Новый формат
  начинается с пресета, а не с новой таблицы.
- Схема поддоменов в базе не зашита: адрес → сайт через таблицу `SiteHost`.
- Миграции: `migrate diff` → файл → `migrate deploy` (`migrate dev` интерактивен).

## После завершения задачи

`bun scripts/tasks.mjs done MC-NNN --summary "…"`, дальше общий чек-лист —
`.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** mugcup
**Порт:** 3128
**Домен prod:** см. `apps/mugcup/PLAN.md` (приватный)
**Сервер:** s2 (ещё не развёрнуто)
**БД:** PostgreSQL + ZenStack, локально контейнер `mugcup-postgres-dev` (порт 5471)
**Submodule:** kamiletar/letar-private-mugcup
**Описание:** сервис для проведения и судейства творческих соревнований
