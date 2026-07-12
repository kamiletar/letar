# @letar/deploy-engine

Lib + CLI на хосте для zero-downtime деплоя (PLAN.md §18.6, Фаза 3). Реализует
docker-rollout-паттерн поверх текущего production-compose вместо Kamal (причина решения —
§18.6: NPM/registry-трение Kamal постоянное, а нужная нам часть — health-check + переключение

- rollback по sha-тегу — ограниченный объём работы).

**Сессия E:** каркас — `doctor`, `status`, executor-инъекция, схема deploy-manifest.
**Сессия G:** `rollout` — docker-rollout-паттерн, unit-тестирован против мокнутого executor'а;
branching в `deploy-affected.sh` по opt-in label (пока dead code — ни один production-compose ещё
не выставляет `letar.rollout: 'true'`). Найденный конфликт с `apps/dashboard` (точное сравнение
имени контейнера) — устранён (`findContainerByName`, см. «Ограничения» ниже),
`apps/time/docker-compose.production.yml` мигрирован под rollout-профиль (`doctor --app time` —
6/7 required ✅). **Живой пилот (включение label + прод-деплой с curl-мониторингом) не
проводился** — следующий шаг, требует супервизии в реальном времени. `rollback` — сессия H, тем же
принципом.

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
- **✅ Блокер миграции `time` устранён (сессия G, продолжение):** `doctor`'ская проверка
  `no-container-name` требует убрать `container_name` из compose сервиса `app` (нужно для
  `--scale app=2`), а `apps/dashboard` раньше искал контейнер приложения по **точному** имени
  (`DeployedApp.containerName`, роуты `api/apps/[app]/{stats,status,logs}` + legacy
  `CONTAINER_NAME_MAP`) — без `container_name` реальное имя контейнера становится `<project>-app-1`
  (дефолтная нумерация compose), точное совпадение ломалось, и Dashboard тихо терял docker
  stats/logs/status. Исправлено: `apps/dashboard/src/lib/server-client/find-container.ts` —
  `findContainerByName()` принимает точное имя ИЛИ `<name>-N` с числовым суффиксом (не любой
  префикс — не ловит несвязанные контейнеры вроде `<name>-worker`); подключено во всех 4 местах
  точного сравнения. `apps/time/docker-compose.production.yml` мигрирован под rollout-профиль
  (`doctor --app time` — 6/7 required ✅, label намеренно ещё закомментирован).
