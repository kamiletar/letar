# Свои Чужие - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/svoichuzhie/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `svoichuzhie-dev`.
Токен — в памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  agent_name: "svoichuzhie-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка svoichuzhie: <что делаешь>",
  file_reservation_paths: ["apps/svoichuzhie/**"],
  file_reservation_reason: "svoichuzhie development"
)
```

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

1. Обнови `PLAN.md` — отметь задачу как выполненную
2. Обнови `PLAN_COMPLETED.md` — добавь детали реализации
3. Обнови `CHANGELOG.md` — добавь запись об изменениях
4. Обнови `PLAN_TESTING.md` — если добавил тесты
5. Обнови `package.json` — увеличь версию (semver)

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно!** Ни SSH, ни `deploy-affected.sh` — НИКОГДА.

Даже если пользователь скажет «деплой» — отправь запрос BlackCove, а НЕ деплой сам:

```
send_message(
  project_key: "c-web-letar",
  sender_name: "<твоё-имя-агента>",
  to: ["BlackCove"],
  subject: "deploy-request: svoichuzhie",
  body_md: "app: svoichuzhie
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

**Приложение:** svoichuzhie
**Порт:** 3021
**Домен prod:** svoichuzhie.ru
**Домен dev:** svoichuzhie.letar.best
**Сервер:** s2 (185.28.85.195)
**Submodule:** kamiletar/letar-private-svoichuzhie
**БД:** PostgreSQL + ZenStack
**Auth:** Better Auth (email/password + email verification)
**Описание:** Официальный сайт группы «Свои Чужие» — билеты (QTickets), фан-клуб, мерч (Альфа-Банк + CDEK), медиа
