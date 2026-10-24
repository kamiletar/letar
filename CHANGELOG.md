# Changelog

## [0.0.1] — 2026-10-24

### Changed

- Обновлены зависимости в совместимых диапазонах: Next.js и связанные пакеты 16.4.3,
  AI SDK React 4.0.156 и ai 7.0.152, Fumadocs core/ui 16.17.8 и MDX 15.4.10,
  dagre 3.1.2, baseline-browser-mapping 2.11.32 и транзитивные зависимости.

### Security

- Устранены уязвимые транзитивные копии deepmerge-ts и esbuild через overrides/resolutions.
- Serwist использует Zod 4.6.7 через адресные overrides; снят устаревший пин Zod 4.4.3
  у ZenStack CLI, который теперь использует общую исправленную копию 4.6.7.
- Сохранены патчи Chakra UI и hyphenate, защищённые пины и совместимость потребителей Zod 3.
  В bun audit остаётся high GHSA-mrhx-c7xc-m3w5 для Zod 3.25.76.
