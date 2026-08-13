---
description: Разбор необработанных ошибок GlitchTip приложения — issues, стектрейсы, приоритизация, план фикса
arguments: <app> [environment]
---

# GlitchTip Errors - Разбор ошибок приложения

Вытащи из self-hosted GlitchTip (`infra/glitchtip/`, [README](/infra/glitchtip/README.md))
необработанные ошибки приложения `$1`, сгруппируй, приоритизируй и предложи план фикса по
топовым. Опциональный `$2` — фильтр окружения (`staging`/`production`), по умолчанию оба.

Используется MCP-сервер `glitchtip-mcp` (`@letar/glitchtip-mcp`,
[README](/libs/glitchtip-mcp/README.md)) — read-only обёртка над REST API GlitchTip
([libs/glitchtip/README.md](/libs/glitchtip/README.md), эндпоинты `/api/0/...`), а не сырой
curl. Если инструменты `mcp__glitchtip-mcp__*` недоступны (сервер ещё грузится/не подключён) —
дождись их через `ToolSearch` с запросом `glitchtip`, не переходи на curl в обход MCP.

## Подготовка

Токен и org slug — в `infra/glitchtip/.env.local` (не в git, паттерн `.env.*` в `.gitignore`
покрывает; не путать с `infra/glitchtip/.env` — тот хранит секреты самого сервиса на сервере,
`.env.local` — личный API-токен, который читает `glitchtip-mcp`).

Если файла нет — создай по образцу и попроси владельца заполнить:

```bash
cat > infra/glitchtip/.env.local <<'EOF'
GLITCHTIP_BASE_URL=https://errors.s3.letar.best
GLITCHTIP_ORG=<org-slug>
GLITCHTIP_API_TOKEN=<personal auth token>
EOF
```

Токен создаётся **только** в GlitchTip UI → Settings → Auth Tokens (сессионный логин) — API не
даёт токену создавать другие токены, `/api/0/api-tokens/` отвечает `401` на токен-авторизацию.
Права — `project:read` + `event:read` (read-only достаточно — `glitchtip-mcp` ничего не мутирует,
см. ниже). Org slug — Settings → организация (тот же, что в URL дашборда).

Если `glitchtip_list_projects` падает с ошибкой про `GLITCHTIP_API_TOKEN`/`GLITCHTIP_ORG` —
останови команду и попроси пользователя выпустить токен через UI, не пытайся угадывать или
генерировать его сам (правило `.claude/rules/security.md`).

## Алгоритм

### 1. Список необработанных issues (14 дней, по частоте)

```
mcp__glitchtip-mcp__glitchtip_list_issues({ project: "$1", environment: "$2" })
```

`environment` передавай, только если `$2` задан. По умолчанию инструмент отдаёт `is:unresolved`
за 14 дней, отсортированные по убыванию частоты (`sort: -count` — у GlitchTip свой, не
Sentry-совместимый набор значений `sort`, см. [glitchtip-mcp/README.md](/libs/glitchtip-mcp/README.md)).

Если issues нет — сообщи об этом и останови команду, дальше разбирать нечего.

### 2. Детали топ-N issues (по умолчанию N=10, либо все — если их меньше)

Для каждого issue из топа — последнее событие со стектрейсом:

```
mcp__glitchtip-mcp__glitchtip_get_issue_event({ issueId: "<id из шага 1>" })
```

### 3. Группировка

Схлопни issues в кластеры по `culprit`/типу исключения — одна и та же причина часто рождает
несколько issues с разными сообщениями (разные ID пользователя, разные значения в тексте
ошибки). Не считай их отдельными проблемами при приоритизации.

### 4. Приоритизация

Сортируй кластеры по `count × recency`, не по одному `count` — старая проблема с 500 событиями
за месяц не обязательно важнее новой с 20 событиями за час (растущий тренд). Отметь отдельно:

- **production** vs **staging** — production всегда выше по приоритету при равной частоте;
- issues, где `userCount` большой (многих пользователей задело) — выше issues с тем же `count`,
  но от одного источника (retry-loop одного клиента);
- регрессии (issue был `resolved`, снова появился) — если API отдаёт `status: unresolved` с
  `numComments`/`statusDetails`, показывающими повторное открытие, отметь явно.

### 5. Локализация в коде

Для каждого топового кластера возьми верхний фрейм стектрейса, принадлежащий коду приложения
(не `node_modules`/фреймворку) — `filename`/`lineno` из `exception.stacktrace.frames` в ответе
`glitchtip_get_issue_event`. Прочитай этот участок `apps/<app>/src/...` и определи вероятную
причину: не гадай по одному сообщению об ошибке, смотри реальный код на этой строке и функцию
целиком.

### 6. План фикса

Для каждого топового кластера — краткий вывод: причина (если очевидна из кода), предлагаемый
фикс, файл:строка. Не вноси правки автоматически без запроса пользователя — эта команда только
разбирает и предлагает; сложные/спорные случаи явно пометь как «нужно уточнение».

## Что НЕ делает эта команда

⛔ Не резолвит и не игнорирует issues — `glitchtip-mcp` намеренно не даёт mutating-инструментов
(`PUT /api/0/issues/<id>/` со `status: resolved` — действие на внешнем сервисе, требует явного
запроса пользователя каждый раз, не должно быть доступно агенту в рамках обычного разбора).

⛔ Не деплоит фикс — после правки кода дальше обычный `git commit` → `nx lint`/`typecheck:tsgo` →
деплой-запрос BlackCove ([deploy-coordination.md](/.claude/rules/deploy-coordination.md)), как
для любого изменения.

## Формат вывода

Таблица кластеров (заголовок, culprit, count, окружения, тренд), затем по каждому топовому —
подраздел с причиной, файл:строка, предлагаемым фиксом.

## Документация

- [infra/glitchtip/README.md](/infra/glitchtip/README.md) — таблица подключённых приложений,
  список project slug
- [libs/glitchtip-mcp/README.md](/libs/glitchtip-mcp/README.md) — MCP-сервер, инструменты, формат
  секретов
- [libs/glitchtip/README.md](/libs/glitchtip/README.md) — SDK-обёртка приложений, `scrubPii`
- [personal-data.md](/.claude/docs/personal-data.md) — почему PII в событиях уже вычищен на
  этапе отправки (`scrubPii`), но не полагайся на это при пересказе содержимого ошибок
  пользователю — не копируй в отчёт значения, похожие на email/телефон/токен, если они всё же
  проскочили в `extra`/сообщении
