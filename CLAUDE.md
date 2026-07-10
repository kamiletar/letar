# CLAUDE.md

Этот файл содержит инструкции для Claude Code (claude.ai/code) при работе с кодом в этом репозитории.

## Общайся со мной на русском

## Документация

Подробная документация в `.claude/docs/`: [repo-structure](/.claude/docs/repo-structure.md) ⭐ (публичный + приватные submodules), [environment](/.claude/docs/environment.md), [forms](/.claude/docs/forms.md), [data-fetching](/.claude/docs/data-fetching.md), [ui-components](/.claude/docs/ui-components.md), [database](/.claude/docs/database.md), [auth](/.claude/docs/auth.md), [architecture](/.claude/docs/architecture.md), [mcp-servers](/.claude/docs/mcp-servers.md), [deployment](/.claude/docs/deployment.md), [code-style](/.claude/docs/code-style.md), [documentation-guidelines](/.claude/docs/documentation-guidelines.md), [e2e-testing](/.claude/docs/e2e-testing.md), [unit-testing](/.claude/docs/unit-testing.md) ⚠️ (vitest + vite 8 oxc: обязательный tsconfig.spec.json), [images](/.claude/docs/images.md), [email](/.claude/docs/email.md), [pwa-offline](/.claude/docs/pwa-offline.md), [user-profile](/.claude/docs/user-profile.md), [admin](/.claude/docs/admin.md), [personal-data](/.claude/docs/personal-data.md) ⭐ (152-ФЗ, РКН, cookie-согласия, чекбоксы ПДн), [media-server](/.claude/docs/media-server.md) (загрузка/транскод видео, BullMQ+ffmpeg, интеграция новых приложений).

**Инфраструктура:** [nginx-proxy-manager](/infra/nginx-proxy-manager/README.md), [server-recovery](/.claude/docs/server-recovery.md), [server-provision](/.claude/docs/server-provision.md) (новый сервер с нуля), [backup-architecture](/.claude/docs/backup-architecture.md), [secret-manager](/.claude/docs/secret-manager.md) (SOPS + age).

## Быстрый старт

**Приложения:** Используй MCP `nx_workspace` для списка приложений и портов. Подробнее: [environment](/.claude/docs/environment.md)

### Структура репо

`letar` — **публичный** монорепо. 10 приватных приложений/lib подключены через **git submodules** (aboi, driving-school + db + e2e, premium-rosstil + e2e, imot + e2e, dsperevod). Подробнее: [repo-structure](/.claude/docs/repo-structure.md).

**Клонирование с приватными:** `git clone --recurse-submodules git@github.com:kamiletar/letar.git`

**Работа с submodule:** изменяешь код → коммит/пуш внутри submodule → `git add <path> && git commit` в letar для фиксации SHA.

**Git hooks (установить один раз после клонирования):**

```bash
cp scripts/hooks/pre-commit-sops.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Хук авто-шифрует `.env.docker` → `.env.docker.enc` перед каждым коммитом (если доступен sops + age-ключ). Подробнее: [secret-manager](/.claude/docs/secret-manager.md).

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
- **Документируй:** Найденные особенности добавляй в `.claude/docs/`. **Превентивно обновляй существующие doc-файлы** когда поведение системы изменилось, и **создавай новые** когда появился значимый паттерн/решение которого ещё нет в docs — не жди явного запроса. Это касается в том числе **UI/UX паттернов**: компонентов Chakra UI, паттернов форм, анимаций, адаптивной вёрстки, accessibility-решений. После изменения doc-файла добавь ссылку в раздел «Документация» этого файла если её ещё нет.

**Перед коммитом:** `nx format` → `nx lint` → `nx typecheck:tsgo`

⚠️ `lint` автоматически запускает oxlint первым (fast-fail), затем ESLint. `typecheck:tsgo` в 9-38x быстрее обычного typecheck.

**Окружение:** Windows (нативный), `nx` и `bun` глобальные (❌ НЕ `bunx nx`/`npx nx`). При передаче аргументов в underlying tool: `nx e2e app-e2e -- --project=chromium`

**MCP серверы:** nx-mcp, next-devtools, chakra-ui, **form-mcp**, **deploy-mcp**, inkeepMcp, context7, chrome-devtools, sequential-thinking, context-mode, agent-mail, **postgres-\*** (driving-school, kami, premium-rosstil, grandslamcup), **prisma**, **socraticode**, **letar-consultant**. Подробнее: [MCP серверы](/.claude/docs/mcp-servers.md)

**SocratiCode** — MCP-сервер семантического поиска по кодовой базе (Qdrant + Ollama + ast-grep). При первом запуске поднимает Docker-контейнеры (~5 мин). После: «Проиндексируй кодовую базу» → спрашивай «What is the codebase index status?». Контекстные артефакты (схемы БД, docs) — [`.socraticodecontextartifacts.json`](/.socraticodecontextartifacts.json). **Правило использования:** [socraticode-first](/.claude/rules/socraticode-first.md) — когда и какой инструмент вызывать (codebase_search vs codebase_context_search vs codebase_symbol vs codebase_impact). Используй вместо grep для семантического поиска.

**letar-consultant** — локальный AI-консультант (qwen2.5-coder:14b @ Ollama + RAG). Даёт «вторую голову» для синтеза архитектурных решений по letar. Инструменты: `consult_letar({ question, mode, chunks })`, `consultant_status`. **Правило использования:** [consult-local](/.claude/rules/consult-local.md). Вызывай когда нужна рекомендация/объяснение поверх данных из SocratiCode.

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

**Формы:** `schema.zmodel` @form.\* → `nx zenstack:generate` → `createForm()` инстанс → `form-mcp` MCP → `@letar/forms`. Каждое приложение **ОБЯЗАНО** иметь свой `createForm` инстанс (образец: `driving-school`). Если фичи нет — делегируй через agent-mail (`.claude/rules/form-delegation.md`). ⚠️ **Перед работой прочитай** `libs/forms/README.md`.

**Data Fetching:** Гибридный подход — React 19 хуки для форм, TanStack Query для списков. См. [Data Fetching](/.claude/docs/data-fetching.md).

**Мультитенантность:** `driving-school` — эталон реализации Better Auth Organizations + ZenStack access policies. См. `.claude/skills/zenstack-helper/reference/zenstack-better-auth.md`.

**Команды:** `nx dev|build|test|lint|format|typecheck:tsgo <app>`, `nx zenstack:generate|db:push|db:migrate|db:studio <app>`, `nx e2e <app>-e2e`. Подробнее: [environment](/.claude/docs/environment.md)

---

**Обновлено:** 2026-05-16 | **Nx** 22.6 | **Next.js** 16.2 | **React** 19 | **Chakra** 3.34 | **Zod** 4.3 | **ZenStack** 3.5 | **Prisma** 7.6 | **Scope:** `@letar/*`

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
