# Dashboard Agent - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/dashboard-agent/PLAN.md` для текущего состояния задач (если есть)

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

1. Обнови `PLAN.md` — отметь задачу как выполненную
2. Обнови `CHANGELOG.md` — добавь запись об изменениях
3. Обнови `package.json` — увеличь версию (semver)

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно!** Ни SSH, ни `deploy-affected.sh` — НИКОГДА.

Даже если пользователь скажет «деплой» — отправь запрос BlackCove, а НЕ деплой сам:

```
send_message(
  project_key: "C:/web/letar",
  sender_name: "<твоё-имя-агента>",
  to: ["BlackCove"],
  subject: "deploy-request: dashboard-agent",
  body_md: "app: dashboard-agent
reason: <что сделал>
commit: <hash>",
  topic: "deploy",
  importance: "high",
  ack_required: true
)
```

Если BlackCove не отвечает 10 минут — спроси пользователя прежде чем деплоить вручную.

Подробности: `.claude/rules/deploy-coordination.md`

## Проект

**Приложение:** dashboard-agent (Node.js, Fastify)
**Сервер:** s1 (194.164.245.97)
**Описание:** Лёгкий агент мониторинга — сбор метрик системы, Docker контейнеров, PostgreSQL
**Особенности:** Без UI, фоновый сервис. Данные отправляет в dashboard (s2)
