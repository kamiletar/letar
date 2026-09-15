# Changelog — @letar/ui

## [0.22.0] — 2026-09-15

### Added

- Подпути-экспорты в `package.json` — по одному на каждый файл `src/lib/*` (49 штук,
  `@letar/ui/tooltip`, `@letar/ui/app-toaster` и т.д.), в дополнение к корневому barrel `.`.
  Причина: `index.ts` реэкспортирует всё разом одним модулем, и под Vite dev-пребандлом
  (non-Next потребитель — Electron renderer, `nx dev`) импорт даже одного компонента тянет
  в пребандл весь модуль целиком, включая куски вокруг `next/link`/`next/image`/
  `next/navigation` — эти next-модули читают `process.env.*` на верхнем уровне и падают
  `ReferenceError: process is not defined` под `contextIsolation: true`. Разбор —
  [vite-dev-letar-ui-barrel-process-undefined.md](/.claude/docs/vite-dev-letar-ui-barrel-process-undefined.md),
  найдено в `kami-key-the` (редизайн v1.8.0). Существующие потребители через корневой `.`
  не затронуты — полная обратная совместимость.
- `peerDependencies.next` помечен `peerDependenciesMeta.next.optional: true` — non-Next
  потребитель, использующий только подпути без next-зависимых компонентов, больше не получает
  предупреждение об отсутствующей peer-зависимости.

## [0.21.0] — 2026-09-08

### Added

- `BarChart` — серверный inline-SVG bar-chart без зависимостей, вынесен из дублирующихся
  `RevenueChart` (studio, `/owner/finance`) и `TimeChart` (studio,
  `/owner/clients/[id]/reports`). Поддерживает один слой данных или два (фон + накладка),
  форматирование значения и максимума шкалы передаётся снаружи.
