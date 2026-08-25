# Changelog

Все изменения в проекте animatrona-landing документируются в этом файле.

## [0.4.2] - 2026-08-25

### Fixed

- `--webpack` в `dev`/`build` — превентивный фикс hydration-бага Turbopack+Emotion (Chakra
  `ChakraProvider` + `next-themes` `ThemeProvider`), см.
  `.claude/docs/nextjs16-turbopack-default-emotion-hydration.md`

## [0.4.1] - 2026-08-25

### Fixed

- Touch target для текстовой ссылки «Конфиденциальность» в футере (WCAG 2.5.5) — `TouchLink` из `@letar/ui`

## [0.3.0] - 2026-02-15

### Added

- Инстант-ревалидация кэша (REVALIDATE_SECRET)
- Яндекс Метрика интеграция
- Улучшение SEO

### Fixed

- Адаптивная сетка Features и Tech Stack

## [0.2.0] - 2026-01-09

### Добавлено

- **Mobile Menu**: Drawer навигация для мобильных устройств с плавной анимацией
- **Active Section Indicator**: Индикатор активной секции в навбаре через Intersection Observer
- **Smart Download Button**: Автоопределение платформы пользователя (Windows/macOS/Linux)
- **Animated Counters**: Анимированные счётчики статистики в Hero секции
- **Typing Effect**: Эффект печатающего текста для подзаголовка
- **Aurora Gradient**: Анимированный градиентный фон с движущимися blob-ами
- **FAQ Section**: Новая секция с часто задаваемыми вопросами (Accordion)
- **Tech Stack Section**: Секция с иконками используемых технологий
- **Skip Link**: Ссылка для пропуска к основному контенту (accessibility)

### Изменено

- Иконки платформ заменены с эмодзи на SVG (Font Awesome 6)
- Features секция получила stagger-анимации и gradient border для главной фичи
- Hero секция переработана с поддержкой реальных скриншотов
- Улучшена accessibility (skip link, контраст текста)

### Исправлено

- Типизация Framer Motion transition.ease
- Ref типы для animated counters
- Server/Client component separation для event handlers

## [0.1.0] - 2026-01-08

### Добавлено

- Первоначальная версия лендинга
- Hero секция с информацией о приложении
- Features секция с описанием возможностей
- Downloads секция с ссылками на релизы
- Docs секция со ссылками на документацию
- Changelog секция с историей релизов
- Footer с ссылками
- Glassmorphism эффекты
- Интеграция с GitHub API для получения релизов
