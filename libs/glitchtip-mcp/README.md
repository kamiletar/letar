# @letar/glitchtip-mcp

MCP-сервер: read-only доступ к self-hosted GlitchTip (`errors.s3.letar.best`,
[infra/glitchtip/README.md](/infra/glitchtip/README.md)) через её REST API
([libs/glitchtip/README.md](/libs/glitchtip/README.md) — GlitchTip Sentry-совместим, `/api/0/...`).

## Инструменты

| Инструмент                                                                        | Действие                                                            | Эндпоинт GlitchTip                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| `glitchtip_list_projects()`                                                       | Все проекты организации (slug совпадает с именем приложения)        | `GET /api/0/organizations/{org}/projects/`    |
| `glitchtip_list_issues({ project, environment?, statsPeriod?, status?, limit? })` | Issues проекта, по умолчанию `is:unresolved` за 14 дней, по частоте | `GET /api/0/projects/{org}/{project}/issues/` |
| `glitchtip_get_issue_event({ issueId })`                                          | Последнее событие issue — сообщение и стектрейс                     | `GET /api/0/issues/{id}/events/latest/`       |

Только чтение — сервер не резолвит/не игнорирует issues и не мутирует ничего на стороне
GlitchTip. Это осознанное решение (см. `.claude/commands/infra/glitchtip-errors.md`), не
недоработка: mutating-действия — по явному запросу пользователя каждый раз, не через MCP-тул,
который агент может дёрнуть в рамках обычного разбора.

## ⚠️ `sort` не Sentry-совместим

В отличие от остального API, значения `sort` в GlitchTip свои — `count`/`-count`/`priority` и
т.п., не Sentry-шные `freq`/`date`/`new`. `listIssues` в `client.ts` жёстко использует `-count`
(по убыванию частоты); `freq` возвращает `422 Unprocessable Entity`. Обнаружено на живом смоук-тесте
при первом запуске сервера (2026-08-13).

## Соединение и секреты

- **Обычный HTTP fetch**, без SSH-туннеля — `errors.s3.letar.best` публичный домен (Traefik).
- **`GLITCHTIP_BASE_URL`/`GLITCHTIP_ORG`/`GLITCHTIP_API_TOKEN`** читаются из `process.env`, а если
  не заданы — из `infra/glitchtip/.env.local` (не в git, паттерн `.env.*` в `.gitignore`;
  отдельно от `infra/glitchtip/.env` — тот хранит секреты самого сервиса на сервере). Дефолт
  `GLITCHTIP_BASE_URL` — `https://errors.s3.letar.best`.
- **Auth Token создаётся только через GlitchTip UI** (Settings → Auth Tokens, сессионный логин) —
  API намеренно не даёт токену создавать/управлять другими токенами
  (`/api/0/api-tokens/` отвечает `401` на токен-авторизацию, только на сессионную). Рекомендуемые
  права — `project:read` + `event:read`, этому серверу больше не нужно.

## Запуск

Регистрируется в корневом `.mcp.json` как `glitchtip-mcp` (`bunx tsx libs/glitchtip-mcp/src/cli.ts`),
запускается из корня репозитория. Env-override `GLITCHTIP_MCP_REPO_ROOT` — если cwd не корень репо.

## Команды

```bash
nx test glitchtip-mcp
nx lint glitchtip-mcp
nx typecheck:tsgo glitchtip-mcp
nx serve glitchtip-mcp   # ручной запуск сервера по stdio
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/glitchtip-mcp` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/glitchtip-mcp` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
