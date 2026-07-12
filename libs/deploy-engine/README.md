# @letar/deploy-engine

Lib + CLI на хосте для zero-downtime деплоя (PLAN.md §18.6, Фаза 3). Реализует
docker-rollout-паттерн поверх текущего production-compose вместо Kamal (причина решения —
§18.6: NPM/registry-трение Kamal постоянное, а нужная нам часть — health-check + переключение

- rollback по sha-тегу — ограниченный объём работы).

**Сессия E:** каркас — `doctor`, `status`, executor-инъекция, схема deploy-manifest.
**Сессия G (текущая):** `rollout` — docker-rollout-паттерн, unit-тестирован против мокнутого
executor'а; branching в `deploy-affected.sh` по opt-in label (пока dead code — ни один
production-compose ещё не выставляет `letar.rollout: 'true'`, см. «Ограничения» ниже — миграция
`time` заблокирована найденным конфликтом с dashboard). **Живой пилот не проводился.**
`rollback` — сессия H, тем же принципом.

## Архитектура

- **Executor-инъекция.** Все shell/файловые операции идут через интерфейс
  `DeployEngineExecutor` (`runCommand`/`readFile`/`writeFile`/`fileExists`). Продакшен —
  `createNodeExecutor()` (`node:child_process` `execFile`, не `exec` — аргументы отдельным
  массивом, без shell-интерполяции). В тестах — in-memory реализация, без живого Docker/ФС.
- **`doctor`** — читает `apps/<app>/docker-compose.production.yml`, проверяет готовность
  сервиса `app` к rollout: нет `container_name`/`ports`, есть network alias `<app>-app` на
  `premium-network`, есть `healthcheck`, `image` использует `${DEPLOY_TAG:-latest}` (не
  хардкод-тег), есть opt-in label `letar.rollout: 'true'`. `stop_grace_period` — info-проверка,
  не блокирует готовность. `rollout` откажется работать без пройденного `doctor`.
- **`status`** — читает `.deploy-manifest/<app>.json` (история деплоев: `deployId`, `sha`,
  `imageTag`, `migrationsApplied[]`, `timestamp`), возвращает последнюю запись + возраст.
  Манифест — источник «предыдущего sha» для будущего `rollback` (сессия H).
- **`rollout`** — docker-rollout-паттерн: `doctor` (гейт) → `docker compose up -d --no-recreate
  --scale app=2` (новый контейнер детерминированно `<project>-app-2`, старый `<project>-app-1`
  не трогается) → poll `docker inspect --format '{{.State.Health.Status}}'` нового контейнера до
  `healthy` → `docker exec <npmContainerName> nginx -s reload` (резолвит alias на оба IP) →
  `docker stop`+`docker rm` старого → повторный reload. Останавливается на первом неуспешном шаге
  (`RolloutResult.steps[]`, каждый шаг — `{ id, ok, detail? }`). Пока НЕ пишет deploy-manifest
  (свяжется в сессии H вместе с `rollback`).

## CLI

```bash
# из корня репозитория
bun run libs/deploy-engine/src/cli.ts doctor --app grandslamcup
bun run libs/deploy-engine/src/cli.ts status --app time
bun run libs/deploy-engine/src/cli.ts rollout --app time --deploy-tag abc1234

# через Nx
nx run @letar/deploy-engine:cli -- doctor --app grandslamcup
```

`doctor`/`rollout` выходят с кодом `0` при успехе, `1` при провале (диагностика — per-check/
per-step ✅/❌/⚠️ с деталями). `status` печатает JSON. `rollout` принимает `--npm-container`
(по умолчанию `nginx-proxy-manager` — канонический `container_name` из
`infra/nginx-proxy-manager/docker-compose.yml`), `--project-name` (по умолчанию = `--app`),
`--env-file` (по умолчанию `.env.docker`).

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
  runRollout,
} from '@letar/deploy-engine'

const executor = createNodeExecutor()
const report = await runDoctor(executor, 'grandslamcup') // { app, composePath, ready, checks[] }
const status = await getStatus(executor, 'time') // { app, latest, totalDeploys, ageMs }
const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' })
```

## Ограничения

- Только `doctor` + `status` + `rollout` (без записи манифеста) + чтение/запись deploy-manifest.
  `rollback` — не реализован, сессия H (PLAN.md §18.6).
- `doctor`/`rollout` работают только с production-compose. Staging остаётся на force-recreate
  (маршрутизация через `172.17.0.1:host-port`, простой некритичен) — вне скоупа.
- **🔴 Найденный блокер миграции `time` (сессия G):** `doctor`'ская проверка `no-container-name`
  требует убрать `container_name` из compose сервиса `app` (нужно для `--scale app=2` — Docker
  Compose не даёт фиксированное имя контейнеру при scale>1). Но `apps/dashboard` хранит
  `containerName` как **точное** имя контейнера в `DeployedApp` (реестр `prisma/seed.ts`) и ищет
  контейнер по этому имени 1:1 (`apps/dashboard/src/app/api/apps/[app]/{stats,status,logs}/
route.ts`, плюс legacy `CONTAINER_NAME_MAP`) — без `container_name` реальное имя контейнера
  становится `<project>-app-1` (дефолтная нумерация compose), точное совпадение ломается, и
  Dashboard тихо теряет docker stats/logs/status для этого приложения. Это ломается **уже на
  старом force-recreate пути**, не только при живом rollout — поэтому убрать `container_name` из
  compose небезопасно для ЛЮБОГО приложения, пока Dashboard не научится резолвить контейнер по
  network alias (или label) вместо точного имени. Миграция `apps/time/docker-compose.production.yml`
  подготовлена и проверена локально (`doctor --app time` — 6/7 required ✅, только label
  отсутствует намеренно), но **не закоммичена** — блокер должен решаться отдельной задачей
  (Dashboard: container discovery по alias/label) до подключения первого приложения к rollout.
