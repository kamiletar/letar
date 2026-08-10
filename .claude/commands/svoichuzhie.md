# Свои Чужие - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/svoichuzhie/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

Фиксированное имя агента: `svoichuzhie-dev`. Общий шаблон вызова `macro_start_session` —
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

## Учёт времени

Проект ведётся для клиента студии по **почасовой оплате**. Когда заработает MCP-сервер учёта
времени (`libs/studio-time-mcp`, Фаза 11 в `apps/studio/PLAN.md`) — стартовать таймер при начале
работы:

```
time_start({ app: "svoichuzhie", description: "<что делаешь, языком клиента>" })
```

⚠️ В `description` — только предмет работы по этому проекту. Никаких других клиентов, чужих
проектов и внутренней кухни: описание видит заказчик. При смене вида деятельности —
`time_switch`, в конце сессии — `time_stop`.

## Проект

**Приложение:** svoichuzhie
**Порт:** 3021
**Домен prod:** svoichuzhie.ru
**Домен dev:** svoichuzhie.letar.best
**Сервер:** s2 (185.28.85.195)
**Submodule:** kamiletar/letar-private-svoichuzhie
**БД:** PostgreSQL + ZenStack
**Auth:** Better Auth (email/password + email verification)
**Описание:** Официальный сайт группы «Свои Чужие» — билеты (QTickets), фан-клуб, мерч (Альфа-Банк + CDEK), медиа
