# @letar/glitchtip-mcp

MCP-сервер: доступ к self-hosted GlitchTip (`errors.s3.letar.best`,
[infra/glitchtip/README.md](/infra/glitchtip/README.md)) через её REST API
([libs/glitchtip/README.md](/libs/glitchtip/README.md) — GlitchTip Sentry-совместим, `/api/0/...`).

## Инструменты

| Инструмент                                                                        | Действие                                                            | Эндпоинт GlitchTip                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| `glitchtip_list_projects()`                                                       | Все проекты организации (slug совпадает с именем приложения)        | `GET /api/0/organizations/{org}/projects/`    |
| `glitchtip_list_issues({ project, environment?, statsPeriod?, status?, limit? })` | Issues проекта, по умолчанию `is:unresolved` за 14 дней, по частоте | `GET /api/0/projects/{org}/{project}/issues/` |
| `glitchtip_get_issue_event({ issueId })`                                          | Последнее событие issue — сообщение и стектрейс                     | `GET /api/0/issues/{id}/events/latest/`       |
| `glitchtip_set_issue_status({ issueId, status })`                                 | ✍️ Смена статуса группы: `resolved` / `ignored` / `unresolved`       | `PUT /api/0/issues/{id}/` с `{ "status": … }` |

Единственная запись — `glitchtip_set_issue_status` (добавлен 2026-09-21: без него шумовые и старые
группы нельзя было закрыть, разбор оставался «закрыть вручную»). Правила вызова:

- **Только по явной просьбе пользователя** и только для перечисленных им id — это действие на
  внешнем сервисе. Обычный разбор (`/infra:glitchtip-errors`) сам ничего не закрывает.
- Схема строгая (`z.strictObject`): `issueId` — только цифры (подставляется в путь запроса),
  `status` — из трёх значений; лишний ключ отвергается до обращения к GlitchTip.
- Какой статус: `resolved` — исправлено или сошло на нет; при новом событии GlitchTip сам
  переоткроет группу (регресс виден). `ignored` — шум, не баг (зонды сканеров): группа молчит и
  при новых событиях не всплывает. Свежие группы, по которым ждётся выкладка фикса, не закрывай —
  сначала проверь, что после неё новых событий нет.

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
  (`/api/0/api-tokens/` отвечает `401` на токен-авторизацию, только на сессионную). Чтения хватает
  `project:read` + `event:read`; для `glitchtip_set_issue_status` токену нужны права на запись
  (используемый токен их имеет — проверено живой сменой статуса 2026-09-21). Нет прав — ответ
  `403`, инструмент вернёт `isError` с кодом; выпустить новый токен с записью может только
  владелец через UI, агент его не создаёт.

## Запуск

В монорепо не регистрируется отдельно — с 2026-09-14 это одна из частей объединённого MCP-сервера
`letar` (`.claude/mcp/letar.ts`, см. [mcp-servers.md](/.claude/docs/mcp-servers.md#letar)),
подключается через `createGlitchtipMcpServer()`. Как самостоятельный процесс (например для
использования вне этого монорепо) — `bunx tsx libs/glitchtip-mcp/src/cli.ts` из корня репозитория,
как раньше. Env-override `GLITCHTIP_MCP_REPO_ROOT` — если cwd не корень репо.

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
