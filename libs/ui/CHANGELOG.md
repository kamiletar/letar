# Changelog — @letar/ui

## [0.23.0] — 2026-09-26

### Added

- `createControlRecipes({ borderToken })` — рецепты рамки полей (`input`, `textarea`, `checkmark`, `radiomark`, `select`, `nativeSelect`, `combobox`) с семантическим токеном рамки (по умолчанию `border.control`, WCAG 2.2 §1.4.11) и полным порядком anatomy. Приложение само определяет токен в `semanticTokens`.

## [0.22.3] — 2026-09-24

### Changed

- `CookieBanner` — на телефоне кнопки «Настроить»/«Принять все» прижаты к правому краю, как
  «Сохранить выбор»/«Принять все» в развёрнутой панели (раньше свёрнутый и развёрнутый режимы
  выравнивались по-разному). На десктопе раскладка не изменилась.

## [0.22.2] — 2026-09-23

### Fixed

- `UserMenu` — триггер меню стал настоящим `<button type="button">` вместо `HStack` (`div`) с
  `tabIndex`. Zag вешает на триггер `aria-expanded`/`aria-haspopup`, на `div` без роли это
  нарушение axe `aria-allowed-attr` (critical, ловил e2e a11y-скан админки), а Enter/Space с
  клавиатуры `div` не нажимали. Имя пользователя — `<span>` вместо `<p>` внутри кнопки.

## [0.22.1] — 2026-09-17

### Fixed

- `CookieBanner` — ссылка «Подробнее в политике ПДн» получила постоянный `textDecoration:
  underline` вместо только `_hover`. Отличалась от окружающего текста лишь цветом
  (`brand.solid` на `fg.muted`, контраст 1.53:1 при пороге WCAG 3:1) — axe (`link-in-text-block`)
  ловил это в WebKit (`design-system.spec.ts`, `sales-funnel-a11y.spec.ts`,
  `configurator.spec.ts` в `domwellbes-e2e`), хотя вычисленные цвета идентичны во всех
  браузерах — разница только в том, распознаёт ли конкретный движок axe нарушение.

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
