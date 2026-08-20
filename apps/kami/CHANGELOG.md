# Changelog

Все значимые изменения в проекте документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

## [0.33.4] - 2026-08-20

### Changed

- **`useReducedMotion`** (`src/app/_hooks/use-reduced-motion.ts`) удалён — дублировал
  `useMediaQuery(breakpoints.prefersReducedMotion)` из `@letar/hooks` (обнаружено при аудите
  дублей по монорепо). Единственный потребитель, `matrix-rain.tsx`, переключён на общий хук.

## [0.33.3] - 2026-08-13

### Fixed

- **Клавиатурный фокус мог прятаться под sticky-шапкой** (WCAG 2.4.11 Focus Not Obscured) —
  найдено при аудите sticky-шапок по монорепо (образец бага — `domwellbes`): у `html` не было
  `scroll-padding-top`, а шапка (`SkipLink` на `#main-content`, TOC блога) переносится между
  мобильным и десктопным блоком с разной высотой. Подключён общий `HeaderScrollPadding` из
  `@letar/ui` (`cssVar="--kami-header-h"`).

## [0.33.1] - 2026-07-28

### Fixed

- **Портфолио отдавало мёртвые demo-ссылки.** `prisma/seed.ts` — карточки проектов «Premium Rosstil» и «IMOT» указывали `demoUrl` на decommissioned `https://premium.rosstil.ru/` и `https://imot.letar.best` (оба приложения выведены из эксплуатации 2026-07-05). `demoUrl` убран у обеих карточек, описание/технологии оставлены как история портфолио. Найдено при повторном аудите хвостов decommission (`apps/dashboard-agent/PLAN.md`).

## [0.31.1] - 2026-07-12

### Fixed

- **Превентивный фикс `ERR_DLOPEN_FAILED: libvips-cpp.so`** — после прод-инцидента в `mandala`
  (см. корневой `PLAN.md` Сессия №70/№71) добавлен `outputFileTracingIncludes` в
  `next.config.js`: Next.js standalone tracer не подхватывает `.so`-файл, который `sharp`
  грузит через `dlopen()`. Глоб `./node_modules/.bun/@img+sharp-libvips-*/**/*.so*` без
  привязки к версии переживёт апдейт `sharp`/`bun.lock`.

## [0.31.0] - 2026-06-06

### Added

- Загрузка файлов произвольного формата (exe, zip, pdf и т.д.) через /admin/files
- Модель `UploadedFile` в БД (макс. 500MB, хранение в uploads/files/)
- API route POST/DELETE `/api/arbitrary-upload`
- Пункт «Файлы» в сайдбаре админ-панели

## [0.30.2] - 2026-04-04

### Added

- Контент 10 проектов и 28 навыков

### Changed

- React startYear обновлён на 2016

### Fixed

- force-dynamic для Keystatic API роутов
- Исправление URL

## [0.29.0] - 2026-03-21

### Added

- ConfirmDialog компонент (`useConfirmDialog` хук) — замена browser `confirm()`
- Error boundaries: глобальный `error.tsx` и admin `error.tsx`
- Responsive admin sidebar — Drawer на mobile с hamburger-кнопкой
- Empty state для AudioTable

### Changed

- Расширены semantic tokens: `bg.subtle`, `bg.panel`, `bg.code`, `border`, `border.subtle`
- Хардкод цветов заменён на semantic tokens (~15 файлов) — корректный dark mode
- Auth формы: error/success алерты с dark mode поддержкой
- Chat компоненты: semantic tokens вместо `white`/`purple.500`/`gray.200`
- Blog: MDX content, comments, page — semantic tokens
- Admin sidebar: semantic tokens + `aria-current="page"`
- Admin таблицы: `overflowX="auto"` обёртка (12 таблиц)
- Touch targets: `size="xs"` → `size="sm"` на кнопках в audio/images таблицах
- `colorPalette="purple"` → `"fg"` (бренд) в admin формах и uploaders
- `w="80px"/"140px"` → `minW` в images-table
- `width="150px"` → responsive в image-uploader
- Image uploader: keyboard accessible (`role="button"`, `tabIndex`, `onKeyDown`)
- Icon buttons: добавлены `aria-label` в audio/images таблицах

### Fixed

- Hero: `gray.950` → `gray.900` (совместимость Chakra v3)
- Consulting form: `gray.500` → `fg.muted`
- Projects page: `color="white"` → `fg.contrast`
- Admin layout: `gray.50/gray.900` → `bg.subtle`, responsive padding

## [0.28.0] - 2026-03-21

### Added

- Кросс-постинг блог-постов в соцсети (Фаза 7, Этап 1)
- Модели SocialPlatform и CrossPost в schema.zmodel
- Сервисы публикации: Telegram (через прокси) и VK (прямой API)
- Server Actions: publishPost, retryPost, getPostPublications, getEnabledPlatforms
- Админ-панель /admin/social — управление платформами
- Админ-панель /admin/social/logs — логи публикаций с фильтрами по статусу
- Кнопка «Опубликовать в соцсети» на странице блог-поста (только для админов)
- Пункт «Соцсети» в сайдбаре админки
- Facebook кросс-постинг через Graph API v21.0 (через прокси)

## [0.27.0] - 2026-03-21

### Changed

- Quiz: незалогиненные пользователи видят результаты сразу (client-side подсчёт), вместо блокирующего auth gate
- Баннер с предложением регистрации под результатами — объясняет зачем периодически проходить тест
- Ответы гостей сохраняются в sessionStorage, автосабмит на сервер после логина

### Removed

- Состояние `auth_gate` — заменено на показ результатов с баннером

## [0.25.1] - 2026-03-21

### Removed

- Страница «Который час?» — перенесена в отдельное приложение `time`
- Навигационная ссылка whatHour из хедера
- Переводы whatHour (ru/en)
- Маршрут what-hour из sitemap

## [0.26.0] - 2026-03-21

### Added

- Стратифицированная выборка вопросов: каждая порция из 50 вопросов содержит пропорциональное представительство всех 13 шкал с гарантией минимум 1 вопроса на шкалу
- Секция «Порционное прохождение и стратификация» на странице /quiz/for-professionals

### Changed

- Убрана кнопка досрочного завершения порции — тест завершается автоматически после последнего вопроса в порции
- Валидация сабмита: min(1) ответ вместо min(10), проверка на пустые ответы на клиенте

## [0.23.0] - 2026-03-20

### Added

- 3 новые шкалы личности: BAR (Переменчивый Маятник / Биполярный), PAG (Упрямый Партизан / Пассивно-агрессивный), DPR (Задумчивый Философ / Депрессивный)
- 290 новых вопросов (1666–1955): BAR-фокусированные (100), PAG (100), DPR (80), дифференциальные BOR↔BAR (10)
- BAR/PAG/DPR скоринг для всех 1665 существующих вопросов
- Точная формула нормализации TZ v2 (actual_max по пройденным вопросам вместо answered×3)
- Индикаторы достоверности шкал (insufficient/low/moderate/high)
- Кризисный блок с телефоном доверия 8-800-2000-122 при BAR/DPR/BOR ≥ 60%
- BAR-фильтр: предупреждения при BAR ≥ 40%, BOR+BAR ≥ 40%, DPR+BAR комбинации
- Дисклеймер с чекбоксом «Я ознакомился и согласен» перед тестом
- Сокращённый дисклеймер в подвале результатов
- «Светлые стороны» — развёрнутые позитивные профили для 13 типов
- «Взаимодействия типов» — 45 пар с динамикой, сильными сторонами, рисками, советами
- 3 модификатора настроения (BAR, PAG, DPR) для парных взаимодействий
- Страница /quiz/for-professionals — руководство для клинических психологов

### Changed

- Radar chart: 13 осей (вместо 10), уменьшен шрифт подписей
- Формат подписей: «Прилагательное Существительное» (Бдительный Страж, Переменчивый Маятник и т.д.)
- Топ-3 карточки: цветовое выделение ≥ 40%/60%, блок whenHigh при высоком балле
- Описания шкал обновлены на основе рекомендаций клинического психолога

## [0.22.0] - 2026-03-19

### Added

- UserProvider — контекст пользователя на верхнем уровне (layout.tsx)
  - Серверная сессия + isAdmin передаются через React Context
  - useUser() хук для клиентских компонентов (без запросов к БД)
  - OnlyFor компонент теперь использует useUser() вместо useSession()
- 1665 вопросов квиза в production БД (100 из seed + 1565 из MD файлов)
- Сохранение ответов квиза в sessionStorage (защита от потери при ошибке)
- Автозавершение теста после ответа на последний вопрос

### Fixed

- Подсветка активного пункта меню — зелёный фон вместо невидимого fg.50
- Белый экран на /quiz при отсутствии вопросов — fallback UI
- Seed overflow: Date.now() % 2_000_000_000 (Int range)
- Лидерборд: аватар не наезжает на текст (flexShrink + overflow)
- Обработка ошибок сети при сабмите квиза (404 после деплоя)

### Changed

- SZD тип: "Одинокий" → "Самодостаточный" / "Self-Reliant"
- Контейнер результатов квиза расширен до 6xl, две колонки на lg+

## [0.16.1] - 2026-03-18

### Fixed

- Кнопка админки в Header — добавлена видимая иконка ⚙ рядом с аватаром (для админов)
- Исправлен `isAdmin()` — cookieCache Better Auth не включал roles, теперь fallback на БД

## [0.14.1] - 2026-02-01

### Added

- Поле `startYear` в модели Skill — год начала практики для автоматического расчёта опыта
- Переключатель режима ввода опыта в форме навыка: "Указать лет" / "Указать год начала"
- Автоматический расчёт количества лет опыта на публичной странице /skills

### Changed

- Обновлена форма /admin/skills/new с выбором способа ввода опыта
- Список навыков в админке показывает год начала рядом с количеством лет

## [0.14.0] - 2026-02-01

### Added

- Admin Learning CRUD — страницы создания и редактирования элементов обучения
  - `/admin/learning/new` — создание нового LearningItem
  - `/admin/learning/[id]` — редактирование существующего LearningItem
  - Server Actions: createLearningItemAction, updateLearningItemAction, deleteLearningItemAction
- Admin Skills CRUD — полная админка для управления навыками
  - `/admin/skills` — список навыков с пагинацией
  - `/admin/skills/new` — создание нового навыка
  - `/admin/skills/[id]` — редактирование навыка
  - `/admin/skills/categories` — список категорий навыков
  - `/admin/skills/categories/new` — создание категории
  - `/admin/skills/categories/[id]` — редактирование категории
  - Server Actions: createSkillAction, updateSkillAction, deleteSkillAction, createSkillCategoryAction, updateSkillCategoryAction, deleteSkillCategoryAction
- Добавлен пункт "Навыки" в sidebar админ-панели

## [0.13.1] - 2026-01-22

### Fixed

- Исправлена провалившаяся миграция 0_init в production БД
- Добавлены недостающие paths в tsconfig.json для workspace библиотек (@letar/chakra-provider, @letar/yandex-metrika, @letar/forms)
- Исправлена ошибка module resolution при сборке с Turbopack

## [0.13.0] - 2026-01-03

### Added

- Подключен zenstack-form-plugin для генерации форм
- Better Auth organizations — командные опросы

### Changed

- Консолидация labels + UI токены
- Рефакторинг HireForm на step-компоненты
- Унификация админ-панели
- Унификация констант и motion хуков

### Fixed

- Улучшена i18n консистентность
- Исправлены проблемы безопасности

## [0.12.0] - 2026-01-01

### Changed

- **BREAKING**: Замена Serwist на ручной Service Worker
  - Удалены зависимости `@serwist/next` и `serwist`
  - Удалён `src/sw.ts` (Serwist-based)
  - Добавлен `public/sw.template.js` (ручной SW)
  - Добавлен `scripts/update-sw-version.mjs` (генерация sw.js с версией)
  - Обновлён `project.json` (target `update-sw-version`, `build` зависит от него)

### Fixed

- Совместимость с Turbopack в Next.js 16+ (Serwist не поддерживает Turbopack)

## [0.11.0] - 2026-01-01

### Changed

- **BREAKING**: Миграция с Auth.js на Better Auth
  - Схема БД: `emailVerified` теперь Boolean (было DateTime)
  - Таблица `VerificationToken` переименована в `Verification`
  - Поля Account/Session переименованы в camelCase

### Added

- Плагин `emailVerification` — автоматическая отправка email при регистрации
- Плагин `magicLink` — вход по ссылке без пароля
- Плагин `genericOAuth` — для Yandex OAuth
- Cookie caching для сессий (5 минут)
- Rate limiting для auth endpoints

### Removed

- Кастомные страницы verify-email/magic-link (Better Auth обрабатывает внутри)
- Устаревшие action файлы: verify-login.action.ts, verify-magic-link.action.ts, verify-email.action.ts

## [0.10.0] - 2025-12-23

### Added

- Telegram Login Widget с HMAC-SHA256 верификацией
- Email сервис (Nodemailer + Yandex SMTP / Mailhog для dev)
- Страница verify-email с авто-логином после верификации
- Server action для верификации токена

## [0.9.0] - 2025-12-23

### Added

- Полная авторизация с базой данных (OAuth + email/password)
- Регистрация и вход по email/password
- Интеграция с PostgreSQL через Prisma

## [0.8.0] - 2025-12-23

### Added

- RSS-фид для блога
- JSON-LD структурированная разметка
- Auth.js v5 с GitHub OAuth

## [0.7.0] - 2025-12-23

### Added

- Страница CV/Резюме (`/cv`)
- Страница "Который час?" (`/time`)
- Обновлён стек технологий в CV

## [0.6.0] - 2025-12-08

### Added

- Блог с Keystatic CMS и Markdoc рендерингом
- humans.txt

## [0.5.0] - 2025-12-08

### Added

- Страница проектов (`/projects`)
- SEO мета-теги
- Sitemap и robots.txt

## [0.4.0] - 2025-12-08

### Added

- База данных Prisma + ZenStack:
  - Модели: SkillCategory, Skill, Project, HireRequest
  - Сиды с начальными данными (навыки, проекты)
  - Nx targets для работы с БД
- Страница навыков (`/skills`):
  - Категории с иконками
  - Карточки навыков с уровнями и опытом
  - Бейджи Featured для ключевых навыков
  - Локализация RU/EN
- E2E тесты для страницы навыков

## [0.3.0] - 2025-12-08

### Added

- Страница "О себе" (`/about`):
  - Hero секция с заголовком и описанием
  - Статистика (7+ лет опыта, 30+ проектов, 50+ технологий)
  - Карточки "Чем занимаюсь" (Архитектура, Разработка, Менторинг)
  - Технологический стек в чипсах
  - CTA кнопка на страницу навыков
- Компоненты:
  - `StatCard` — карточка статистики
  - `FeatureCard` — карточка функциональности
- E2E тесты для страницы "О себе" (RU/EN)
- Установлен `lucide-react` для иконок

## [0.2.0] - 2025-12-08

### Added

- Chakra UI v3 с кастомной темой:
  - Изумрудно-золотая цветовая палитра (Matrix стиль)
  - Поддержка светлой/тёмной/системной темы
  - ThemeSwitcher компонент
- Header компонент:
  - Логотип и основная навигация
  - LanguageSwitcher (RU/EN dropdown)
  - ThemeSwitcher (light/dark/system)
  - MobileMenu (hamburger drawer)
- Footer компонент:
  - Ссылки на социальные сети (GitHub, Telegram, LinkedIn, Email)
  - Копирайт с годом
- Matrix Rain эффект:
  - Canvas-анимация с падающими символами
  - Катакана + цифры + латиница
  - Настраиваемые параметры (цвет, скорость, размер)
- Hero-секция:
  - Интеграция Matrix Rain как фона
  - CTA кнопки (Познакомиться, Позвать на работу)
  - Анимированный индикатор скролла
- E2E тесты (Playwright):
  - Навигация по сайту
  - Переключение языка
  - Проверка основных компонентов

## [0.1.0] - 2025-12-08

### Added

- Техническое задание (TZ.md) с полным описанием проекта
- Интернационализация (i18n) с next-intl:
  - Поддержка русского и английского языков
  - Структура локализации: routing, request, navigation
  - Базовые переводы для всех секций сайта
  - Middleware для автоматического определения локали
- Конфигурация проекта:
  - trailingSlash для SEO-friendly URL
  - Порт 3005 для dev-сервера
  - Интеграция с Nx монорепо

### Infrastructure

- Домен: kami.letar.best
- CMS: Keystatic (Git-based)
- Аналитика: Yandex Metrica
- База данных: PostgreSQL (shared)
