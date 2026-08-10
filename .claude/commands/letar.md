# Letar - Воркфлоу монорепо (весь репозиторий)

Команда верхнего уровня для работы со **всем монорепо** `letar`, а не с одним приложением.
Используй, когда задача охватывает несколько проектов, инфраструктуру, общие библиотеки
или когда ещё не выбрано конкретное приложение.

## Инициализация

1. Зарегистрируйся в координации агентов под фиксированным именем `letar-dev`
   (токен — в памяти `agent_fixed_names_tokens.md`, таблица «Приложение → agent_name → registration_token»):

   ```
   macro_start_session(
     human_key: "C:/web/letar",
     program: "claude-code",
     model: "claude-sonnet-4-6",
     agent_name: "letar-dev",
     registration_token: "<токен из agent_fixed_names_tokens.md>",
     task_description: "Монорепо-задача: <что делаешь>"
   )
   ```

2. Прочитай `CLAUDE.md` в корне — главные инструкции и стек.
3. Вызови MCP `nx_workspace` — получи актуальную карту проектов, портов и графа зависимостей.
4. При необходимости загляни в `.claude/docs/repo-structure.md` ⭐ (публичный репо + приватные submodules).

## Действия

После изучения контекста:

- Определи, каких проектов/библиотек касается задача (`nx_project_details`, `nx affected`).
- Если задача относится к одному приложению — переключись на его команду (`/kami`, `/driving-school`, …).
- Если задача сквозная (libs, инфра, документация, релизы) — спланируй порядок изменений.
- Перед редактированием `libs/**` проверь резервации файлов через Agent Mail.
- Предложи план действий и согласуй с пользователем.

## Качество (перед коммитом)

```
nx format → nx lint → nx typecheck:tsgo
```

Для сквозных изменений запускай по затронутым проектам:

```
nx affected -t lint typecheck:tsgo test
```

⚠️ `nx` и `bun` — глобальные (❌ НЕ `bunx nx` / `npx nx`).

## После завершения задачи

1. Обнови `PLAN.md` затронутых приложений — отметь задачи выполненными.
2. Обнови `CHANGELOG.md` / `PLAN_COMPLETED.md` там, где они ведутся.
3. Подними версию в `package.json` затронутых проектов (semver).
4. Для изменений в `libs/**` — обнови README библиотеки и затронутые `.claude/docs/`.
5. Закоммить логически связанные изменения (см. `.claude/rules/git.md`).

⚠️ В монорепо одновременно работают несколько агентов — добавляй **только свои файлы**
(`git add apps/<app>/` или `git add libs/<lib>/`), без `git add .` и без `git reset`.

## Приватные submodules

Приватные приложения (aboi, driving-school + db + e2e, premium-rosstil + e2e, imot + e2e, dsperevod) —
git submodules. Изменения: коммит/пуш **внутри submodule** → `git add <path> && git commit` в `letar`
для фиксации SHA. Подробнее: `.claude/rules/git.md`, `.claude/docs/repo-structure.md`.

## Релиз npm-пакетов

Локально: `nx release` (bump + changelog + commit + tag) → `git push --follow-tags`.
CI по тегу (`forms-v*`, `form-mcp-v*`, `zenstack-form-plugin-v*`) публикует в npm.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Репозиторий

**Монорепо:** letar (публичный) + 10 приватных приложений/lib через git submodules
**Стек:** Node 24 · Nx 22 · Next.js 16 · React 19 · Chakra UI v3 · PostgreSQL + Prisma + ZenStack · @letar/forms + Zod v4
**Команды приложений:** `/kami`, `/driving-school`, `/premium-rosstil`, `/imot`, `/aboi`, … (см. `.claude/commands/`)
**Сквозные команды:** `/workflow:*`, `/infra:*`, `/audit:*`, `/create:*`
