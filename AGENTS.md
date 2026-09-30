# AGENTS.md

Общие инструкции для Claude Code, Codex и других агентов в монорепозитории Letar.

## Общайся со мной на русском

## Документация

Карта документации и найденных ловушек: [INDEX.md](/.claude/docs/INDEX.md).
Перед работой в незнакомой области найди в ней нужный раздел. Правила, которые
применяются к конкретным файлам, находятся в `.claude/rules/`.

## Быстрый старт

**Приложения:** Используй MCP `nx_workspace` для списка приложений и портов. Подробнее: [environment](/.claude/docs/environment.md)

### Структура репо

`letar` — **публичный** монорепо. Приватное подключено **git submodules**; актуальный список
всегда `git config -f .gitmodules --get-regexp path`, не по памяти — на 2026-09-16 их 14
(приложения и их `-e2e`, `libs/driving-school-db`, `.claude/private`). Подробнее:
[repo-structure](/.claude/docs/repo-structure.md).

**Клонирование с приватными:** `git clone --recurse-submodules git@github.com:kamiletar/letar.git`

**Работа с submodule:** изменяешь код → коммит/пуш внутри submodule → `git add <path> && git commit -- <path>` в letar для фиксации SHA.

**Git hooks (установить один раз после клонирования):**

```bash
bash scripts/hooks/install.sh
```

Ставит связку pre-commit хуков и одного pre-push (ниже — основные; полный набор — в шапке
`scripts/hooks/install.sh`):

- `pre-commit-scope-guard.sh` — блокирует голый `git commit`/`git add -A`, затянувший файлы из
  нескольких несвязанных `apps/*`/`libs/*`: типовая причина, по которой один агент коммитит чужую
  незакоммиченную работу другого. Обход для легитимных multi-scope коммитов —
  [git.md § Работа рядом с другими агентами](/.claude/rules/git.md).
- `pre-commit-syntax-check.sh` — блокирует коммит staged `.ts/.tsx`, которые не парсятся (только
  парсер, доли секунды, проверяет содержимое **индекса**); обход осознанного WIP —
  `GIT_ALLOW_SYNTAX_ERRORS=1`. Разбор — [git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md).
- `pre-commit-semgrep.sh` — статический анализ безопасности по staged-файлам.
- `pre-commit-dprint-check.sh` — блокирует коммит файлов не в стиле dprint (например после
  случайного Prettier-форматирования голой `nx format`).
- `pre-commit-deps-integrity.sh` — целостность зависимостей (патчи + peer-диапазоны), запускается
  **только** если в staged-наборе есть `bun.lock`/`package.json`; обычный коммит по коду не платит
  ничего. См. раздел «Проверки целостности» ниже.
- `pre-commit-docs-index.sh` — gate `docs-index-integrity` («новый док → две записи»: `AGENTS.md` +
  `INDEX.md`, ссылки живы), **только** если в коммите есть `.claude/docs/*.md` или `AGENTS.md`;
  проверяет **индекс**, незастейдженная запись не считается. Обход — `GIT_SKIP_DOCS_INDEX=1`.
- `pre-commit-sops.sh` — авто-шифрует `.env.docker` → `.env.docker.enc`, если доступен sops +
  age-ключ; подробнее — [secret-manager](/.claude/docs/secret-manager.md).
- `pre-push-submodule-check.sh` — блокирует push letar, если записанный SHA submodule ещё не
  существует на его origin. Такой push ломает **не приложение-виновника, а весь деплой сразу**
  (`upload-pack: not our ref` внутри `git submodule update` — до выбора приложения). Обход —
  `GIT_ALLOW_UNPUSHED_SUBMODULES=1 git push`; проверить руками —
  `bash scripts/check-submodule-push-state.sh`. Разбор —
  [git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md).

### Проверки целостности монорепо

Проверки в `scripts/check-*` (патчи зависимостей, peer-диапазоны, намеренные пины версий,
дрейф electron, subpath-пути `@letar/*`, шаблоны `.gitignore` в submodule, неотправленные
коммиты submodule, брошенные worktree) собраны под общий раннер — актуальный состав всегда
у `--list`, не по этому списку:

```bash
bun scripts/check-all.mjs
```

`--list` — реестр с уровнями, `--group=deps` — подмножество, `--only=<id>` — точечно, `--ci` —
режим CI. Уровень **gate** роняет прогон, **warn** (накопленный долг) и **отчёт** — нет; до
2026-08-28 это различие существовало только в комментариях внутри самих скриптов.

Запускается автоматически в двух точках: pre-commit (узко — см. `pre-commit-deps-integrity.sh` и
`pre-commit-docs-index.sh` выше) и шаг `Integrity checks` в [ci.yml](/.github/workflows/ci.yml).

⚠️ **Зелёный CI на этих проверках ≠ зелено везде.** Приватные submodule в CI намеренно не
выкачиваются, поэтому `electron-drift` не видит `poster-microtext-desktop`, а `lib-subpath-paths` —
tsconfig приватных приложений. Раннер печатает «неполное покрытие» вместо того, чтобы молча
зеленеть на отсутствующих файлах ([verification-pitfalls](/.claude/docs/verification-pitfalls.md)),
но полное покрытие даёт только локальный прогон.

⚠️ **Не добавляй submodule пути в `.gitignore`** — Nx уважает gitignore и спрячет проекты из графа.

### Релиз npm-пакетов

Локально: `nx release` (bump + changelog + commit + tag + GitHub release) → `git push --follow-tags`. CI на тег (`forms-v*`, `form-mcp-v*`, `zenstack-form-plugin-v*`) запускает [publish-npm.yml](/.github/workflows/publish-npm.yml) — npm publish напрямую из letar.

### Технологический стек

- **Node:** 24 | **Монорепо:** Nx 22 | **Фреймворк:** Next.js 16 | **React:** 19
- **UI:** Chakra UI v3 | **БД:** PostgreSQL + Prisma + ZenStack | **Формы:** @letar/forms + Zod v4
- **Тесты:** Vitest 4.0, Playwright | **Линтинг:** oxlint + ESLint | **Формат:** dprint | **PM:** Bun

### Методология

- **TDD:** Red → Green → Refactor
- **Планирование:** Веди `PLAN.md` и `PLAN_TESTING.md` в каждом приложении. Если просят сделать что-то, чего нет в PLAN.md — сразу заноси. Когда сделал — отмечай выполненным
- **Коммиты:** Делай автоматически после готовых изменений. Подними версию в package.json
- **Shared-first:** При написании любого компонента, хука или утилиты — сразу оценивай, нужно ли это другим приложениям. Если да — создавай в `libs/` и экспортируй через `@letar/*`, а не дублируй в `apps/`.
- **Не создавай новые приложения/библиотеки руками:** `nx g @letar/generators:new-app <name>` (чистый Next.js + Chakra v3 каркас, без boilerplate, который потом вычищаешь) и `nx g @letar/generators:new-lib <name>` — см. `libs/generators/README.md`.
- **Документируй:** Найденные особенности добавляй в `.claude/docs/`. **Превентивно обновляй существующие doc-файлы** когда поведение системы изменилось, и **создавай новые** когда появился значимый паттерн/решение которого ещё нет в docs — не жди явного запроса. Это касается в том числе **UI/UX паттернов**: компонентов Chakra UI, паттернов форм, анимаций, адаптивной вёрстки, accessibility-решений. После изменения doc-файла добавь ссылку в раздел «Документация» этого файла если её ещё нет.

**Перед коммитом:** `nx run-many -t format --projects=<твои проекты>` → `nx lint` → `nx typecheck:tsgo`

⚠️ **`--projects` обязателен.** Голая `nx run-many -t format` заходит внутрь семи приватных
submodule (2089 файлов) и трогает чужие файлы, даже когда правок ноль; форма без
`--projects`/`--exclude` блокируется хуком `.claude/hooks/validate-bash.js`. Нужен прогон по
всему публичному репо — `dprint fmt` из корня (у него `cwd` в корне, `excludes` работают).
Разбор — [dprint-worktree-submodule-scope](/.claude/docs/dprint-worktree-submodule-scope.md).

⚠️ **Голая `nx format` (без `run-many -t`) — другая команда, она запускает Prettier мимо dprint**
и тоже блокируется хуком. Имена совпали случайно, не перепутай синтаксис. Второй канал той же
порчи — свой `targets.format` в `project.json` с `prettier --write` (480 файлов за один прогон):
[prettier-dprint-conflict-root-cause](/.claude/docs/prettier-dprint-conflict-root-cause.md),
запрет — [formatting.md](/.claude/rules/formatting.md).

⚠️ `lint` автоматически запускает oxlint первым (fast-fail), затем ESLint. `typecheck:tsgo` в 9-38x быстрее обычного typecheck.

**Окружение:** Windows (нативный), `nx` и `bun` глобальные (❌ НЕ `bunx nx`/`npx nx`). При передаче аргументов в underlying tool: `nx e2e app-e2e -- --project=chromium`

**MCP серверы:** nx-mcp, **letar** (объединяет studio-time/studio/umami/glitchtip/deploy/form/synth/
domwellbes-assist в один процесс), **letar-db** (все Postgres-базы), context-mode (плагин),
agent-mail. Документация внешних библиотек — desktop-расширение Context7, не проектный сервер.
Подробнее: [MCP серверы](/.claude/docs/mcp-servers.md)

⚠️ **Ревизия 2026-09-14: 22 записи в `.mcp.json` → 4.** Прежде чем возвращать в список что-то
удалённое — проверь, что инструмент будет вызываться, а не просто числиться (у выброшенных было
25–39 вызовов за 1779 сессий). Браузерная работа идёт через встроенный Claude Browser,
семантический поиск — через Grep и субагента Explore. Что с чем слито и почему, а также почему
`nx-mcp` обязан запускаться с `--minimal false` (иначе `nx_workspace` просто нет в списке
инструментов) — [mcp-servers.md](/.claude/docs/mcp-servers.md).

**⚠️ WebFetch заблокирован context-mode:** хук `pretooluse.mjs` блокирует `WebFetch` и перенаправляет на `mcp__context-mode__fetch_and_index(url, source)` + `mcp__context-mode__search(queries)`. Используй именно эти инструменты для загрузки внешних URL.

### Координация агентов (MCP Agent Mail)

**ОБЯЗАТЕЛЬНО:** При начале работы вызови `macro_start_session` — подробности в `.claude/rules/agent-mail.md`. Без регистрации другие агенты не увидят тебя и могут конфликтовать по файлам.

**Context Mode:** Автоматически сжимает вывод MCP (98% экономия). Команды: `/context-mode:stats`, `/context-mode:doctor`, `/context-mode:upgrade`. Подробнее: [MCP серверы](/.claude/docs/mcp-servers.md#context-mode)

**Артефакты (скриншоты, экспорты, временные файлы):** Сохраняй в `.claude/artifacts/` — папка в .gitignore, не засоряет git status. Используй `save_to_disk` с путём в эту папку.

**Комментарии в коде пиши на русском языке** — все комментарии, JSDoc, описания и пояснения в коде.

**⛔ Запрещены `export default`** — используй только именованные экспорты (`export function`, `export const`). **Исключения:** Next.js App Router файлы (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`).

**Критичные импорты:**

```typescript
// Формы — @letar/forms (ЕДИНСТВЕННЫЙ рекомендуемый подход)
import { ChakraFormField, FormGroup, useAppForm } from '@letar/forms'
// Валидация — Zod v4
import { z } from 'zod/v4'
// Генерируемые файлы — src/generated/
import { GenderFormSchema } from '@/generated/form-schemas/enums/Gender.form'
// ZenStack v3 — enhanced клиент из lib/db
import { getEnhancedPrisma } from '@/lib/db'
```

> Полный список импортов см. [Формы и валидация](/.claude/docs/forms.md)

**Воркфлоу:** Редактируй `schema.zmodel` → `nx zenstack:generate` → `nx db:push`. См. [База данных](/.claude/docs/database.md).

**Формы:** `schema.zmodel` `@meta("form.*", value)` (единственный синтаксис: legacy `/// @form.*`-комментарии убраны в zenstack-form-plugin 4.0.0) → `nx zenstack:generate` → `createForm()` инстанс → `form-mcp` MCP → `@letar/forms`. Каждое приложение **ОБЯЗАНО** иметь свой `createForm` инстанс (образец: `driving-school`). Если фичи нет — делегируй через agent-mail (`.claude/rules/form-delegation.md`). ⚠️ **Перед работой прочитай** `libs/forms/README.md`.

**Data Fetching:** Гибридный подход — React 19 хуки для форм, TanStack Query для списков. См. [Data Fetching](/.claude/docs/data-fetching.md).

**Мультитенантность:** `driving-school` — эталон реализации Better Auth Organizations + ZenStack access policies. См. `.agents/skills/zenstack-helper/reference/zenstack-better-auth.md`.

**Команды:** `nx dev|build|test|lint|format|typecheck:tsgo <app>`, `nx zenstack:generate|db:push|db:migrate|db:studio <app>`, `nx e2e <app>-e2e`. Подробнее: [environment](/.claude/docs/environment.md)

---

**Обновлено:** 2026-09-16 | **Nx** 23.2 | **Next.js** 16.2 | **React** 19 | **Chakra** 3.34 | **Zod** 4.3 | **ZenStack** 3.5 | **Prisma** 7.6 | **Scope:** `@letar/*`

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
