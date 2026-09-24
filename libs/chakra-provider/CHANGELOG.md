# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
версионирование следует [Semantic Versioning](https://semver.org/lang/ru/).

## [0.5.0] - 2026-09-24

### Changed

- `ColorModeProvider` закрепляет `color-scheme` темы: `only light` для светлой, `dark` для тёмной
  (CSS по классу на `<html>`, работает до гидратации), а инлайновый `color-scheme` next-themes
  отключает. Раньше Brave/Chrome на Android с «Тёмным режимом для сайтов» перекрашивали светлую
  тему в тёмную, и темы выглядели одинаково. Правка приложениям не нужна;
  `DarkOnlyChakraProvider` ведёт себя как прежде.

### Added

- `ColorModeProvider`: проп `lockColorScheme` (default `true`); `false` возвращает поведение
  next-themes.

## [0.4.0] - 2026-09-24

### Added

- `ColorModeSelect`: проп `labels` — свои подписи режимов (i18n), не заданные берутся из русских
  по умолчанию.
- `ColorModeSelect`: проп `fullWidth` — растянуть переключатель на всю ширину.
