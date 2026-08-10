# Grand Slam Cup - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/grandslamcup/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

Фиксированное имя агента: `grandslamcup-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

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

**Приложение:** grandslamcup
**Порт:** 3016
**Домен:** grandslamcup.letar.best
**Сервер:** s2 (185.28.85.195)
**Auth:** Ключница (OIDC, clientId: grandslamcup-prod)
**БД:** PostgreSQL (порт 5453) + ZenStack
**Описание:** Турнир поэтов — площадка для поэтических турниров и баттлов
