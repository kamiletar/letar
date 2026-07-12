# @letar/deploy-engine

Lib + CLI на хосте для zero-downtime деплоя (PLAN.md §18.6, Фаза 3). Реализует
docker-rollout-паттерн поверх текущего production-compose вместо Kamal (причина решения —
§18.6: NPM/registry-трение Kamal постоянное, а нужная нам часть — health-check + переключение

- rollback по sha-тегу — ограниченный объём работы).

**Сессия E (текущая):** каркас — `doctor`, `status`, executor-инъекция, схема deploy-manifest.
`rollout`/`rollback` — сессии G/H, добавляются в этот же lib теми же принципами (все
docker/git/compose-вызовы через `DeployEngineExecutor`, не напрямую).

## Архитектура

- **Executor-инъекция.** Все shell/файловые операции идут через интерфейс
  `DeployEngineExecutor` (`runCommand`/`readFile`/`writeFile`/`fileExists`). Продакшен —
  `createNodeExecutor()` (`node:child_process` `execFile`, не `exec` — аргументы отдельным
  массивом, без shell-интерполяции). В тестах — in-memory реализация, без живого Docker/ФС.
- **`doctor`** — читает `apps/<app>/docker-compose.production.yml`, проверяет готовность
  сервиса `app` к rollout: нет `container_name`/`ports`, есть network alias `<app>-app` на
  `premium-network`, есть `healthcheck`, `image` использует `${DEPLOY_TAG:-latest}` (не
  хардкод-тег), есть opt-in label `letar.rollout: 'true'`. `stop_grace_period` — info-проверка,
  не блокирует готовность. `rollout` (сессия G) откажется работать без пройденного `doctor`.
- **`status`** — читает `.deploy-manifest/<app>.json` (история деплоев: `deployId`, `sha`,
  `imageTag`, `migrationsApplied[]`, `timestamp`), возвращает последнюю запись + возраст.
  Манифест — источник «предыдущего sha» для будущего `rollback` (сессия H).

## CLI

```bash
# из корня репозитория
bun run libs/deploy-engine/src/cli.ts doctor --app grandslamcup
bun run libs/deploy-engine/src/cli.ts status --app time

# через Nx
nx run @letar/deploy-engine:cli -- doctor --app grandslamcup
```

`doctor` выходит с кодом `0`, если приложение готово к rollout, `1` — если нет (диагностика —
per-check ✅/❌/⚠️ с деталями). `status` печатает JSON.

Корень репозитория — `process.cwd()` по умолчанию, переопределяется `DEPLOY_ENGINE_REPO_ROOT`
(тот же паттерн, что `DEPLOY_MCP_REPO_ROOT` в `libs/deploy-mcp`) — на случай запуска не из корня
(например, будущий вызов из dashboard-agent через `nsenter` в host-namespace, как
`apps/dashboard-agent/src/routes/deploy.ts`).

## API

```typescript
import {
  appendManifestEntry,
  composePathForApp,
  createNodeExecutor,
  getStatus,
  latestEntry,
  readManifest,
  runDoctor,
} from '@letar/deploy-engine'

const executor = createNodeExecutor()
const report = await runDoctor(executor, 'grandslamcup') // { app, composePath, ready, checks[] }
const status = await getStatus(executor, 'time') // { app, latest, totalDeploys, ageMs }
```

## Ограничения (сессия E)

- Только `doctor` + `status` + чтение/запись deploy-manifest. `rollout`/`rollback` — не
  реализованы, следующие сессии (G/H, PLAN.md §18.6).
- `doctor` проверяет только production-compose. Staging остаётся на force-recreate
  (маршрутизация через `172.17.0.1:host-port`, простой некритичен) — вне скоупа `doctor`.
- Ни один текущий production-compose монорепо ещё не проходит `doctor` (миграция на alias/label —
  часть подключения приложения к rollout, сессии G/J).
