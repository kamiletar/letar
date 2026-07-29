# Driving School - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/driving-school.md` для специфичных правил
2. Прочитай `apps/driving-school/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `driving-school-dev`.
Токен — в памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  agent_name: "driving-school-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка driving-school: <что делаешь>",
  file_reservation_paths: ["apps/driving-school/**"],
  file_reservation_reason: "driving-school development"
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
`subject: "deploy-request: driving-school"`.

Шаблон вызова и что делать, если BlackCove молчит 10 минут — `.claude/rules/deploy-coordination.md`.

## Проект

**Приложение:** driving-school
**Порт:** 3003
**Описание:** Автошкола — управление учениками, уроками и финансами
**Правила:** `.claude/rules/driving-school.md`
**Эталон документации:** Используй как образец для других приложений
