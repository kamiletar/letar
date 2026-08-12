# @letar/umami-mcp

MCP-сервер: доступ к self-hosted Umami (`stats.letar.best`) через её REST API вместо браузерной
автоматизации с ручным вводом пароля. Тот же способ авторизации, что уже использует
`apps/dashboard/src/app/api/analytics/*` (`POST /api/auth/login` по username/password, дальше
Bearer-токен).

## Инструменты

| Инструмент                                        | Действие                                                      | Эндпоинт Umami                          |
| ------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------- |
| `umami_list_websites()`                           | Все сайты, заведённые в Umami (имя, домен, id, дата создания) | `GET /api/websites`                     |
| `umami_find_website({ domain })`                  | Проверить, заведён ли домен (точное совпадение)               | `GET /api/websites` + фильтр на клиенте |
| `umami_get_website_stats({ websiteId, period? })` | Статистика сайта: pageviews/visitors/visits/bounces/totaltime | `GET /api/websites/{id}/stats`          |
| `umami_create_website({ name, domain })`          | Завести новый сайт в Umami                                    | `POST /api/websites`                    |

`umami_create_website` возвращает `websiteId` — его нужно вручную положить в
`.env.docker.enc` приложения (`NEXT_PUBLIC_UMAMI_WEBSITE_ID`) и в `docker-compose.production.yml`
(оба места — см. `.claude/rules/env-files.md` § «Новая переменная окружения»). MCP этого не
делает сам.

## Соединение и секреты

- **Обычный HTTP fetch**, без SSH-туннеля — `stats.letar.best` публичный домен.
- **`UMAMI_API_URL`/`UMAMI_API_USER`/`UMAMI_API_PASSWORD`** читаются из `process.env`, а если не
  заданы — из `apps/dashboard/.env.docker` (тот же паттерн, что `studio-time-mcp` использует для
  `apps/studio/.env.local`, см. `libs/studio-time-mcp/src/config.ts`). Дефолты: URL —
  `https://stats.letar.best`, пользователь — `admin`.
- Токен логина кэшируется в памяти процесса на весь stdio-сеанс; при 401 — один автоматический
  повторный логин.
- ⚠️ Пароль передаётся программно через API `POST /api/auth/login` — агент никогда не вводит его
  в форму логина панели Umami. Ручной вход в веб-панель (в т.ч. смена пароля) остаётся действием
  только пользователя.

## Запуск

Регистрируется в корневом `.mcp.json` как `umami-mcp` (`bunx tsx libs/umami-mcp/src/cli.ts`),
запускается из корня репозитория. Env-override `UMAMI_MCP_REPO_ROOT` — если cwd не корень репо.

## Команды

```bash
nx test umami-mcp
nx lint umami-mcp
nx typecheck:tsgo umami-mcp
nx serve umami-mcp   # ручной запуск сервера по stdio
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/umami-mcp` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/umami-mcp` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
