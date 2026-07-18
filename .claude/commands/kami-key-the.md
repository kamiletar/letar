# KamiKeyThe - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/kami-key-the/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `kami-key-the-dev`.
Токен — в памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  agent_name: "kami-key-the-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка kami-key-the: <что делаешь>",
  file_reservation_paths: ["apps/kami-key-the/**"],
  file_reservation_reason: "kami-key-the development"
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

## Проект

**Приложение:** kami-key-the
**Описание:** Системная утилита для ввода типографских символов через AltGr (ремейк TypeItEasy)
**Особенности:** Desktop-утилита (Node.js, без Electron), keysender + systray2
