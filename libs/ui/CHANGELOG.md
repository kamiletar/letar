# Changelog — @letar/ui

## [0.21.0] — 2026-09-08

### Added

- `BarChart` — серверный inline-SVG bar-chart без зависимостей, вынесен из дублирующихся
  `RevenueChart` (studio, `/owner/finance`) и `TimeChart` (studio,
  `/owner/clients/[id]/reports`). Поддерживает один слой данных или два (фон + накладка),
  форматирование значения и максимума шкалы передаётся снаружи.
