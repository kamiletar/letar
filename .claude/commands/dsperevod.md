# DS Perevod - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/dsperevod/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `dsperevod-dev`.
Токен — в памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  agent_name: "dsperevod-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка dsperevod: <что делаешь>",
  file_reservation_paths: ["apps/dsperevod/**"],
  file_reservation_reason: "dsperevod development"
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

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно** — ни SSH, ни `deploy-affected.sh`, ни `docker compose`.
Даже если пользователь скажет «деплой» — отправь запрос BlackCove через Agent Mail с
`subject: "deploy-request: dsperevod"`.

Шаблон вызова и что делать, если BlackCove молчит 10 минут — `.claude/rules/deploy-coordination.md`.

## 152-ФЗ

⚠️ **Любая форма, собирающая персональные данные, ОБЯЗАНА:**

- Записывать `ConsentLog` (IP, user-agent, timestamp, тип согласия)
- Содержать чекбокс согласия с ссылкой на `/privacy/`
- Использовать `recordConsent()` из `src/lib/consent.ts`

Нарушение требований 152-ФЗ недопустимо.

## Проект

**Приложение:** dsperevod
**Порт:** 3019
**Домен:** dsperevod.letar.best
**Сервер:** s2 (185.28.85.195)
**Auth:** Better Auth (email/password)
**БД:** PostgreSQL + ZenStack
**Submodule:** kamiletar/letar-private-dsperevod
**Описание:** Бюро переводов DS Perevod — маркетинговый сайт + панель администратора
