# Kami Key The Landing - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/kami-key-the-landing/PLAN.md` для текущего состояния задач (если есть)

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `kami-key-the-landing-dev`.
Токен — в памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  agent_name: "kami-key-the-landing-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка kami-key-the-landing: <что делаешь>",
  file_reservation_paths: ["apps/kami-key-the-landing/**"],
  file_reservation_reason: "kami-key-the-landing development"
)
```

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

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно** — ни SSH, ни `deploy-affected.sh`, ни `docker compose`.
Даже если пользователь скажет «деплой» — отправь запрос BlackCove через Agent Mail с
`subject: "deploy-request: kami-key-the-landing"`.

Шаблон вызова и что делать, если BlackCove молчит 10 минут — `.claude/rules/deploy-coordination.md`.

## Проект

**Приложение:** kami-key-the-landing
**Порт:** 3011
**Сервер:** s1 (194.164.245.97)
**Описание:** Лендинг утилиты Kami Key The (типографские символы через AltGr)
