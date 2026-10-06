---
name: notebook
description: Воркфлоу разработки notebook — личный блокнот Ками с версиями, офлайном и публикацией в рубрики сайта, регистрация в Agent Mail
disable-model-invocation: true
---

# Блокнот Ками - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/notebook/PLAN.md` для текущего состояния задач
3. Схемы и решения — страница плана: https://claude.ai/artifact/LUsWWH9iycSE4MrkBVrdCZ

## Регистрация в Agent Mail

Фиксированное имя агента: `notebook-dev` (токен — в приватной памяти `agent_fixed_names_tokens.md`).
Общий шаблон вызова `macro_start_session` — см. `.claude/rules/app-workflow.md`.

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно** — отправь запрос `deploy-agent-dev` через Agent Mail
(`subject: "deploy-request: notebook"`), см. `.claude/rules/deploy-coordination.md`.

## Учёт времени

Проект личный, не для клиента студии: таймер не запускай, а если запустил — закрывай через
`time_discard` (см. `.claude/rules/time-tracking.md`).

## Проект

**Приложение:** notebook
**Порт:** 3127
**БД:** PostgreSQL + ZenStack (локально — контейнер `notebook-postgres-dev`, порт 5470)
**Вход:** Better Auth через Ключницу, только `OWNER_EMAIL`
**Описание:** Заметки с версиями, откатом, офлайн-режимом и публикацией в рубрики сайта
**Запуск:** глобальный `nx` в bash может не работать — используй `./node_modules/.bin/nx.exe`
