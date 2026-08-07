# Выполненные задачи — Animatrona Landing

Детальное описание реализованных функций.

## `tsconfig.json`: убраны `references` на библиотеки — TS6305 (2026-08-07)

Тот же баг, что в `dashboard-agent` (0.11.1, `.claude/rules/libs.md` § «Тот же редирект под
обычным `tsc`»): `references` на `../../libs/*` вели на solution-конфиг библиотек и редиректили
на `tsconfig.spec.json`, давая вечный `TS6305`. Массив `references` убран целиком (своего
`tsconfig.spec.json` в файле не было). Побочных `TS6059` здесь не возникло — `rootDir` не
потребовался.

Проверено: `nx typecheck:tsgo animatrona-landing --skip-nx-cache` — было 5 ошибок TS6305, стало 0.
`nx build animatrona-landing` — зелёный.

## v0.4.0 — 2026-07-28 (152-ФЗ: минимальное cookie-уведомление)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8). Только Umami-аналитика, без
аккаунтов/форм — счётчик тоже собирает ПД (IP, cookies). `CookieBanner` из `@letar/ui`
(`consentApiUrl={null}` — localStorage-only, нет БД), `analytics-consent.tsx` (Umami только после
согласия), минимальная страница `/privacy`. `@letar/ui` не был подключён (`package.json`/
`next.config.js`) — добавлен.

## Тесты (2026-07-18)

### Базовый E2E-сьют

- Создан `apps/animatrona-landing-e2e` (Playwright, конвенция `time-e2e`/`pravda-e2e`)
- `playwright.config.ts` использует env-переменную `BASE_URL` (дефолт `http://localhost:3008`) — готовность к staging-гейту
- 14 тестов в 3 файлах: `homepage.spec.ts` (рендер главной, Navbar/Footer, ключевые секции, skip-link), `navigation.spec.ts` (якорная навигация, документация, редирект `/docs`, сайдбар доков), `mobile.spec.ts` (отсутствие horizontal overflow, мобильный Drawer-меню)
- Первый шаг перед подключением приложения к `E2E_GATED_APPS` (letar `PLAN.md` §18.7)

## Версия 0.2.0 (2026-01-09)

### Mobile Menu

- Drawer навигация для мобильных устройств
- Плавная анимация открытия/закрытия
- Закрытие при клике на пункт меню

### Active Section Indicator

- Индикатор активной секции в навбаре
- Реализация через Intersection Observer API
- Плавное переключение при скролле

### Smart Download Button

- Автоопределение платформы пользователя
- Поддержка Windows/macOS/Linux
- Fallback на Windows для неизвестных платформ

### Animated Counters

- Анимированные счётчики статистики в Hero секции
- Подсчёт от 0 до целевого значения
- Запуск при появлении в viewport

### Typing Effect

- Эффект печатающего текста для подзаголовка
- Настраиваемая скорость печати
- Мигающий курсор

### Aurora Gradient

- Анимированный градиентный фон
- Движущиеся blob-элементы
- Плавные переходы цветов

### FAQ Section

- Accordion с часто задаваемыми вопросами
- Chakra UI Accordion компонент
- Плавная анимация раскрытия

### Tech Stack Section

- Секция с иконками используемых технологий
- Font Awesome SVG иконки
- Hover эффекты

### Accessibility

- Skip link для пропуска к основному контенту
- Улучшенный контраст текста
- ARIA атрибуты для интерактивных элементов

## Версия 0.1.0 (2026-01-08)

### Первоначальная версия

- Hero секция с информацией о приложении
- Features секция с описанием возможностей
- Downloads секция с интеграцией GitHub API
- Docs секция со ссылками
- Changelog секция
- Footer с навигацией
- Glassmorphism эффекты

---

**Последнее обновление:** 2026-01-10
