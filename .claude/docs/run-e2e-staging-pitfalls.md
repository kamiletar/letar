# `run_e2e` / `deploy_cancel` на s1: три ловушки цикла «починил → прогнал»

> Найдено 2026-09-23 на `domwellbes` при доводке полного прогона до зелёного перед продом.

## 1. ⚠️ `run_e2e` не делает `git pull` — прогон идёт по старым спекам

`run_e2e` запускает Playwright в `/home/deploy/letar` как есть. Пуллит только `deploy_app`
(`deploy-affected.sh`). Починил только e2e-спеки (без правок приложения, деплой не нужен) и сразу
запустил `run_e2e` — прогон проверяет **прошлую** версию тестов, падения «не уходят».

Признак: `e2e_status` → `lastStatus.commitSha` — это `HEAD` корня letar на s1, не твой коммит.

Лечение — подтянуть checkout на s1 вручную перед прогоном:

```bash
ssh deploy@s1.letar.best 'cd /home/deploy/letar && git pull --ff-only origin main \
  && git submodule update --init --recursive apps/<app>-e2e apps/<app>'
```

e2e-гейт `deploy_app(production)` сверяет коммит прогона с текущим — любой bump после прогона
требует нового полного прогона.

## 2. ⚠️ `deploy_cancel` не убивает дочерний `next build`

SIGTERM получает процесс деплоя, а запущенный им `next build` доживает до конца сам. Следующий
`deploy_app` сразу после отмены падает через ~20 с:

```
⨯ Another next build process is already running.
```

Перед повторным деплоем проверь `ps -eo pid,etime,args | grep "next build"` на s1 и дождись
завершения (или отменяй раньше, до фазы `build`). Тот же lock-механизм Next, что и в
[nx-temp-build-dir-breaks-project-graph](/.claude/docs/nx-temp-build-dir-breaks-project-graph.md).

## 3. ⚠️ Дефолтные воркеры Playwright против однопоточного staging

Без `workers` Playwright берёт все ядра s1 (12). Staging — один процесс `next-server`: SSR и все
Server Actions идут через одно ядро, 12 браузеров просто стоят к нему в очереди. Замер:
2 воркера — 210 тестов за 15 мин, 12 воркеров — 247 за 12 мин (пропускная способность почти та
же), но под 12 воркерами десятки ассертов на server action падали по таймауту — шум, в котором
тонут настоящие баги. Лимит прогона `run_e2e` ~15 мин.

Решение — `workers` в `playwright.config.ts` для прогона против staging (`BASE_URL` задан),
локальный прогон не трогать:

```ts
workers: isLocalDevServer ? undefined : 4,
```

Параметр `workers` у `run_e2e` перебивает конфиг — для точечной проверки подозрения на
ресурсный флак (`workers: 1`).

## 4. Флаг `stalled` у `deploy_wait` на webpack-сборке

`stalled: true` через пару минут после `Creating an optimized production build` — webpack
просто молчит до конца компиляции. Проверка: `ps` на s1 показывает живой `next build` — ждать.
