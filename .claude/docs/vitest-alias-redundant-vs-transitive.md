# vitest resolve.alias для @letar/* — когда избыточен, когда обязателен

Найдено 2026-09-16 при аудите `vitest.config.mts` across 15 приложений (продолжение находки
из сессии по `domwellbes`). `resolve.alias` на `@letar/<pkg>` в `vitest.config.mts` может
дублировать симлинк, который bun isolated linker уже кладёт в
`apps/<app>/node_modules/@letar/<pkg>` по записи в `package.json` `dependencies`
(`workspace:*`) — тогда alias лишний и его можно убрать.

## Как проверить, избыточен ли alias

1. `ls apps/<app>/node_modules/@letar/<pkg>` — если симлинк есть, пакет прямая зависимость.
2. Проверить `exports` пакета (`libs/<pkg>/package.json`) — использованный подпуть должен быть
   там объявлен.
3. Убрать alias, прогнать **полный** `nx test <app>` (не отдельные файлы) — только реальный
   прогон подтверждает резолв, домыслы по exports-карте недостаточны (см. исключение ниже).
4. Если тест падает `Failed to resolve import` — вернуть alias именно для той записи, что
   сломалась (см. пример ниже), не для всех сразу.

## Когда alias оставлять как есть

Симлинка нет — пакет не в `dependencies` приложения, импортируется только транзитивно (обычно
через реэкспорт из другой либы, которая сама держит его в зависимостях). Убирать alias в этом
случае ломает резолв. Найдено в:

- `driving-school`: `@letar/format-utils`, `@letar/api-server` — не в `dependencies`.
- `kami`, `mandala`: `@letar/image-upload` (оба подпути) — не в `dependencies`.
- `pravda`: `@letar/chakra-provider` и `@letar/ui` — не в `dependencies` (`hooks` рядом убран —
  та была прямой). `@letar/ui` вернули 2026-09-24: `theme/recipes/*` импортируют `pressScale`,
  и набор `bookmark-button.test.tsx` падал на `Failed to resolve import`. Прямая зависимость
  не выбрана: правка `bun.lock` ради тестового резолва, а Next/tsgo обходятся без неё.
- `synth`, `time`: `@letar/seo` — не в `dependencies`.
- `aboi`: `@letar/ui` — не в `dependencies` (`admin-ui` есть, `ui` — нет).

Тот же паттерн, что `@letar/format-utils` в `domwellbes` (см.
[vitest-unlinked-workspace-lib-imports.md](vitest-unlinked-workspace-lib-imports.md)) —
транзитивный импорт без прямой зависимости требует alias независимо от того, сколько других
`@letar/*`-алиасов рядом с ним избыточны.

## ⚠️ Ловушка: подпуть резолвится хуже базового импорта того же пакета

`@letar/image-upload` — прямая зависимость, симлинк есть, `exports` пакета объявляет и `.`, и
`./server`. Базовый импорт `@letar/image-upload` резолвится без alias нормально. Подпуть
`@letar/image-upload/server` — **нет**: без alias падает `Failed to resolve import
"@letar/image-upload/server" ... Does the file exist?` при полном прогоне `nx test`, несмотря
на корректно объявленный `exports`. Воспроизведено одинаково в `grandslamcup` и `aboi` —
не единичный сбой конкретного приложения. Причина не выяснена (похоже на особенность
резолва подпутей vite/vitest через symlink конкретно для этого пакета — другие подпуть-алиасы,
например `@letar/forms-core/phone` в `driving-school`, `@letar/driving-school-db/schema` и
аналоги, убираются без проблем).

**Практическое правило:** для `@letar/image-upload` при наличии `/server`-импорта в коде
приложения — убирать только базовый alias, подпуть `/server` оставлять всегда. Полагаться на
`exports`-карту как на доказательство того, что подпуть-alias можно снять, нельзя — только
реальный прогон тестов.

## Приложения, где убраны избыточные алиасы (2026-09-16)

`animatrona-folder-player`, `aprel8008`, `driving-school` (11 из 13 алиасов), `dsperevod`,
`grandslamcup` (только база), `label-printer-desktop`, `pravda` (только `hooks`), `studio`,
`aboi` (6 из 8, `/server`-подпуть и `ui` оставлены).

Не тронуты: `kami`, `mandala`, `synth`, `time` (все алиасы транзитивные, менять нечего);
`aira-web`, `animatrona`, `animatrona-tracker`, `archetest`, `auth-hub`,
`form-develop-app-shadcn`, `svoichuzhie` (алиасов на `@letar/*` в конфиге не было вовсе).
