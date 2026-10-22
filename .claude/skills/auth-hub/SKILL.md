---
name: auth-hub
description: Воркфлоу разработки Auth Hub (Ключница) — централизованный сервис авторизации и SSO
disable-model-invocation: true
---

# Auth Hub - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. ⚠️ **Очередь задач — `apps/auth-hub/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/auth-hub/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next auth-hub`. Вызов с id (`/auth-hub AH-003`) — сразу
   `bun scripts/tasks.mjs show AH-003`. `PLAN.md`, `PLAN_COMPLETED.md` и `PLAN_EMAIL_CODE.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Фиксированное имя агента: `auth-hub-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "auth-hub", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start AH-NNN --owner auth-hub-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new auth-hub …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done AH-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** auth-hub
**Порт:** 3014
**Домен:** auth.letar.best
**Сервер:** s2 (185.28.85.195)
**Auth:** Better Auth + OAuth (Google, Yandex, VK, Telegram)
**БД:** PostgreSQL (порт 5432) + ZenStack
**Описание:** Ключница — централизованный сервис авторизации и SSO для приложений монорепо
