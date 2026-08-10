---
description: Воркфлоу разработки form-example — витрина @letar/forms для внешних пользователей
---

# Form Example - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/form-example/PLAN.md` для текущего состояния задач (если есть)
2. Прочитай `libs/forms/README.md` для контекста библиотеки

## Регистрация в Agent Mail

Фиксированное имя агента: `form-example-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Координация (Forms Coordinator)

**Проверяй inbox** на задачи от координатора (topic: `forms-task`):

```
fetch_inbox(project_key: "c-web-letar", agent_name: "form-example-dev", registration_token: "<токен из agent_fixed_names_tokens.md>", topic: "forms-task", include_bodies: true)
```

После завершения — **отвечай через reply_message**.

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** form-example (Next.js, PostgreSQL)
**Порт:** 3022
**Сервер:** s2 (185.28.85.195)
**БД:** PostgreSQL + ZenStack
**Описание:** Full-stack витрина @letar/forms — 16 интерактивных примеров
