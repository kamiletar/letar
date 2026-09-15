# Nextron + Windows: `npx next build`/`next.exe` резолвит project dir на уровень выше

⚠️ Ловушка ручной диагностики, не баг реального `nx build`/`nx build:win`.

## Симптом

`cd apps/<nextron-app>/renderer && npx next build` (или прямой вызов
`node_modules/.bin/next.exe build` из `renderer/`) падает на этапе «Running TypeScript» с
ошибками вида `TS6305`/`TS6307`, ссылающимися на файлы и `tsconfig.json` **родительского**
каталога приложения (`apps/<app>/tsconfig.json`), а не на `renderer/tsconfig.json` — хотя `cwd`
явно внутри `renderer/`.

Найдено на `label-printer-desktop` (2026-09-15): манифест composite-проекта
`apps/label-printer-desktop/tsconfig.spec.json` был реально сломан (см.
[unit-testing.md](/.claude/docs/unit-testing.md) § «Обратный случай»), но диагностировался он
именно этим неверным путём запуска — сама по себе ошибка `TS6305` возникала не в реальном
nx-таргете, а только при ручной проверке через `npx`.

## Причина

Nextron-структура держит `renderer/` **без собственного `package.json`** (общий с приложением
`apps/<app>/package.json`). Инструментальная проверка (временный `console.error` в
`node_modules/next/dist/lib/verify-typescript-setup.js`, дальше отменена) показала: `next build`,
вызванный через `npx` или напрямую через скомпилированный Bun-шим `node_modules/.bin/next.exe`
на Windows, резолвит внутренний `dir` (базу для поиска `tsconfig.json`) в
`apps/<app>/` — на уровень выше `renderer/`, откуда фактически запущена команда. Причина именно
в `npx`/бинарном шиме `.exe`, не в самом Next.js: прямой вызов JS-скрипта той же версии —
`node ../../../node_modules/next/dist/bin/next build` из `renderer/` — резолвит `dir` верно
(`renderer/`) и собирается без единой TS-ошибки на том же дереве.

## Почему `nx build`/`nx build:win` не задеты

`project.json`-таргеты (`"cd renderer && next build"`) выполняются через executor
`nx:run-commands`, который добавляет `node_modules/.bin` в `PATH` и запускает `next` напрямую
внутри уже установленного `cwd: renderer` — не через `npx`. Проверено эмпирически: полная
чистая сборка (`--skip-nx-cache`, без предыдущих `.next`/`out-tsc`/`tsbuildinfo`) проходит
зелёной без единой правки конфига.

## Что делать

- **Не чинить как «баг tsconfig», пока не воспроизведено через реальный nx-таргет.** Сначала
  прогнать `nx build <app> --skip-nx-cache` на чистом дереве — если он зелёный, ручная
  диагностика через `npx`/`next.exe` вводит в заблуждение.
- Диагностировать напрямую через `node <путь-к-node_modules>/next/dist/bin/next build` из
  `renderer/`, минуя `npx` и `.bin`-шимы — так видно фактическое поведение Next.js без
  Windows/Bun-специфичного слоя резолва.
- Реальные, воспроизводимые на nx-таргете проблемы composite `tsconfig.spec.json` (дублирование
  `include` с корневым конфигом и т.п.) — чинить по паттерну
  [unit-testing.md](/.claude/docs/unit-testing.md) § «Особый случай — Electron-приложения» /
  «Обратный случай — poster-microtext-desktop».

## Затронутые приложения

Nextron-структура (`renderer/` без своего `package.json`) есть у `label-printer-desktop`,
`animatrona`, `poster-microtext-desktop` — ловушка потенциально актуальна для всех трёх при
ручной диагностике через `npx`/`.exe`, не проверялось на двух других.
