# pages — свои страницы вместо Artifact

Сервис `https://pages.letar.best` хранит html-страницы (планы, схемы, отчёты) и отдаёт их после
входа через Ключницу. Публикация идёт одной командой из сессии, без деплоя: MCP-инструмент
`page_publish` в сервере `letar` ([.claude/mcp/pages-part.ts](/.claude/mcp/pages-part.ts)).
Задача — LT-073.

## Как это устроено

| Что          | Как                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------- |
| Хранение     | `/data/pages/<slug>/v<N>/…` плюс `meta.json` (название, `public`, актуальная версия)        |
| Версии       | Тот же slug создаёт следующую версию, старые остаются: `/p/<slug>/v/<N>/`                   |
| Публикация   | `POST /api/pages/<slug>` с `Authorization: Bearer $PAGES_PUBLISH_TOKEN`                     |
| Просмотр     | `GET /p/<slug>/…`; приватная страница без входа ведёт на `/login`                           |
| Вход         | OIDC (authorization code) Ключницы; пускает только email из `PAGES_OWNER_EMAILS`            |
| Безопасность | CSP как у Artifact (скрипты cdnjs, jsdelivr, unpkg; шрифты Google Fonts), `nosniff`, лимиты |
| Зависимости  | Нет: `Bun.serve` и `node:*`. Образ не ставит пакеты, `bun.lock` не затрагивается            |

## Переменные окружения

`BASE_URL`, `PAGES_PUBLISH_TOKEN`, `PAGES_SESSION_SECRET`, `PAGES_OWNER_EMAILS`,
`OIDC_DISCOVERY_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`. Необязательные: `PORT` (3200),
`DATA_PATH` (`/data/pages`), `PAGES_MAX_VERSION_BYTES` (5 МБ), `PAGES_MAX_FILES` (100).

Токен и ключ сессии генерировать из генератора (`openssl rand -base64 32 | tr '+/' '-_'`), не
придумывать. Прод-значения лежат в `infra/pages/.env.docker.enc` (SOPS), локально в `.env.docker`.

## Первая установка (один раз, делает deploy-agent-dev)

1. Клиент OIDC `pages` в Ключнице: redirect URI `https://pages.letar.best/auth/callback`,
   секрет `OIDC_PAGES_SECRET` в `apps/auth-hub/.env.docker.enc`, деплой auth-hub.
2. Сгенерировать `PAGES_PUBLISH_TOKEN` и `PAGES_SESSION_SECRET`, положить в `.env.docker.enc`.
3. На s2 создать каталог `/data/pages`, запустить
   `docker compose -f docker-compose.yml --env-file .env.docker up -d`.
4. В DNS уже есть `*.letar.best` на s2; сертификат берёт Traefik по wildcard.
5. Токен публикации положить на машину владельца в `.env.local` корня репозитория:
   `PAGES_PUBLISH_TOKEN=…` (файл вне git). Адрес по умолчанию `https://pages.letar.best`.

## Проверка

```bash
cd infra/pages && bun test
```

Тесты покрывают публикацию и версии, лимиты, защиту путей, доступ, поток входа с подменённым
OIDC и инструменты MCP. Живую проверку входа через Ключницу нужно сделать после установки на
тестовой странице: на staging у блокнота вход уже ломался (NB-001).
