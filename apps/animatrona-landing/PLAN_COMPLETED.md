# Выполненные задачи — Animatrona Landing

Детальное описание реализованных функций.

## Чистка `<Icon as={IconComponent}>` — semgrep `letar-chakra-as-prop-forbidden` (2026-08-26)

Часть кросс-приложенческой инициативы §61 корневого `PLAN.md` (после `libs/video-player-react`
и `libs/ui`). Все 27 вхождений `<Icon as={IconComponent}>` в 11 файлах
`apps/animatrona-landing/src/app/**` заменены на прямой рендер react-icons-компонента:
`boxSize={N}` → `size={N×4}`, статичный `color="токен"` → `color="var(--chakra-colors-<kebab-
token>)"` (там, где иконка уже наследует цвет от обёртки — проп просто убран), динамический
`as={obj.icon}` → локальная capitalized-переменная перед JSX (`const PlatformIcon = info.icon`,
иначе JSX трактует lowercase-переменную как DOM-тег). Самые крупные файлы — `hero-section.tsx`
(7), `downloads-section.tsx` (6).

Попутно найдены и почищены 2 инстанса `Link as={NextLink}` в `docs-sidebar.tsx` — тот же
semgrep-паттерн ловит **любой** Chakra-компонент с `as=`, не только `Icon`. Фикс — `Link asChild`

- `<NextLink href={...}>` внутри.

Проверено: `nx typecheck:tsgo`/`nx lint` (oxlint+eslint) зелёные, dev-сервер поднят, главная
страница и `/docs/quick-start`, `/docs/troubleshooting` открыты в браузере — без ошибок в
консоли, иконки и переходы по сайдбару рендерятся корректно.

## Чистка `Box/Heading/Text as=` (HTML-теги) — приложение полностью очищено (2026-08-26)

Продолжение сессии выше. Оставшиеся 49 срабатываний (`Box as="section"/"nav"/"footer"/"button"`,
`Heading as="h1"/"h2"/"h3"`, `Text as="span"`) в 16 файлах (11 из исходного списка + `footer.tsx`,
`app-showcase-section.tsx`, `import-flow-section.tsx`, `docs/encoding-profiles/page.tsx`,
`docs/keyboard-shortcuts/page.tsx`) заменены на `asChild` + нативный HTML-тег внутри:
`<Heading asChild size="xl"><h1>...</h1></Heading>`, `<Box asChild id="section"><section>
...</section></Box>`. Уровень заголовка (`h1`/`h2`/`h3`) сохранён 1:1 по семантике исходного
`as=` — не понижен и не потерян ни в одном случае.

Единственный нетривиальный случай — кликабельная точка-индикатор карусели импорта
(`import-flow-section.tsx`, `StepIndicator`): было `Box as="button"` с `onClick`/`aria-label`
прямо на Box, стало `Box asChild` со стилями + вложенный `<button type="button" onClick=.../>`
с HTML-атрибутами.

Проверено: `nx typecheck:tsgo`/`nx lint` зелёные, dev-сервер поднят, все страницы (главная +
`/docs/quick-start`, `/docs/encoding-profiles`, `/docs/keyboard-shortcuts`,
`/docs/troubleshooting`) открыты в браузере живьём — без ошибок в консоли, разметка не изменилась
визуально. Финальный `uvx semgrep scan --config .semgrep/letar-rules.yml apps/animatrona-landing`:
**0 срабатываний** `letar-chakra-as-prop-forbidden` во всём приложении (коммит `19f055a5`).
Severity правила в `.semgrep/letar-rules.yml` не поднималась — решение общее для всего монорепо,
принимается только после чистки всех `apps/*` (см. §61 корневого `PLAN.md`).

## Фикс: fetchPriority вместо устаревшего priority на hero-скриншоте (2026-08-25)

Свежий полный грепп по монорепо нашёл прямой `next/image` с `priority` в `hero-section.tsx` —
Next.js 16 разделил `priority` на `preload`/`fetchPriority`, старый проп больше не выставляет
`fetchpriority="high"`. Root cause — сессия domwellbes 2026-08-25.

## Фикс hydration mismatch — `<div>` внутри `<p>` в FeaturesSection (2026-08-25)

Найдено при визуальной проверке CookieBanner на mobile viewport (не связано с самим CookieBanner).
`features-section.tsx` — точка-маркер под деталями фичи была `<Box w={1} h={1} borderRadius="full"
.../>` (рендерится `<div>`) внутри `<Text>` (рендерится `<p>`) — консоль давала "In HTML, %s
cannot be a descendant of `<p>`" → hydration failed. Проверены соседние секции (hero, faq,
downloads, docs, import-flow, changelog) на тот же паттерн (`w={1} h={1} borderRadius="full"
bg="brand.400"`) — грепом по всему `_components/` нашёлся только этот один случай, changelog его
не содержит вопреки первоначальному предположению из репорта.

Фикс — `Box asChild` с вложенным `<span />` вместо голого `Box` (проект запрещает проп `as=`,
см. `.claude/rules/components.md`). Проверено: после reload в браузере ни один `<p>` на странице
не содержит `<div>`-потомка (`document.querySelectorAll('p')` + `.querySelector('div')` — пусто),
консоль чистая. `nx lint`/`nx typecheck:tsgo`/`nx format` — зелёные.

## `--webpack` в dev/build — превентивный фикс Turbopack+Emotion hydration (2026-08-25)

Часть аудита `.claude/docs/nextjs16-turbopack-default-emotion-hydration.md` (раздел «Аудит по
всему монорепо»). Приложение сочетает Chakra v3 `ChakraProvider` и `next-themes`'ный
`ThemeProvider` как прямого потомка (`_components/ui/provider.tsx`), `dev`/`build` в
`project.json` были голым `next dev -p 3008`/`next build` без флага бандлера — Turbopack по
умолчанию. Фикс — `--webpack` добавлен к обеим командам (эталон — `apps/mandala`). Живая
репродукция гонки клика не проводилась (превентивный фикс по структурному совпадению, как и на
`aira-web`/`auth-hub`) — `nx typecheck:tsgo`/`nx lint`/`nx build` зелёные.

## Touch target для текстовых ссылок — WCAG 2.5.5 (2026-08-25)

Ссылка «Конфиденциальность» в футере переведена на `TouchLink` (`@letar/ui`). Остальные ссылки
футера (GitHub, Релизы, Сообщить о баге, MIT-лицензия) — все `target="_blank"`, не трогались.

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
