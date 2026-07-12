# Time — Выполненные задачи

## 2026-07-12 — Compose-миграция под zero-downtime rollout (инфра-пилот, вне тематики приложения)

`time` выбран пилотом для `libs/deploy-engine` `rollout` (docker-rollout-паттерн, §18.6 Сессия G
корневого `PLAN.md`) — низкорисковое приложение, уже было пилотом сессий A/C того же трека.

- `docker-compose.production.yml`: убран `container_name`/`ports` у сервиса `app` (нужно для
  `docker compose --scale app=2`), добавлен network alias `time-app` на `premium-network`
  (сохраняет NPM Forward Host без изменений), `healthcheck` (профиль grandslamcup), `image` через
  `${DEPLOY_TAG:-latest}` (rollback без пересборки)
- По пути найден и устранён блокер: Dashboard резолвил контейнер приложения по точному имени —
  без `container_name` ломался мониторинг stats/logs/status для `time`. Фикс — отдельная запись в
  `apps/dashboard/PLAN_COMPLETED.md` (`findContainerByName`, версия 1.19.3)
- `doctor --app time` (`bun run libs/deploy-engine/src/cli.ts doctor --app time`) подтверждает
  6/7 required-проверок ✅ — не хватает только opt-in label `letar.rollout: 'true'`, оставлен
  закомментированным намеренно до супервизируемого живого пилота
- commit `8de3029`

## 2026-03-21

- Создано приложение (Next.js 16 + Chakra UI v3, порт 3013)
- Настроена тема (brand: синий, accent: фиолетовый, dark mode)
- Подключена Umami аналитика
- Зарегистрировано в инфраструктуре Dashboard

## 2026-07-10 — Пилот TypeScript 7 GA (инфра-тулинг, вне тематики приложения)

`time` выбран low-risk пилотом для проверки вышедшего стабильного `typescript@7.0.2` (Go-порт, GA 2026-07-08)
перед тиражом на весь монорепо. Подробности и план тиража — корневой `PLAN.md` §19.

- Добавлен nx-таргет `typecheck:ts7` (`bunx --bun typescript@7.0.2 --noEmit`) — изолированно от общего
  `node_modules/.bin/tsc`/`tsgo`, которыми пользуются остальные проекты
- Результат: вывод идентичен `tsc` 6.0.3 и `tsgo` dev-preview (одни и те же 4 pre-existing ошибки — не хватает
  сгенерённых Prisma-файлов); скорость 0.62s vs 2.71s (`tsc`) — паритет с уже используемым `tsgo`
- Найдена и задокументирована ловушка: обычный `bun install` пакета `typescript@7` в корневом `package.json`
  подменяет общий bin `tsc` для всего workspace молча, несмотря на алиас-имя зависимости
- commit `4698c97`
