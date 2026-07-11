# Changelog

Все изменения библиотеки @letar/auth документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
версионирование следует [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

## [0.8.1] - 2026-07-11

### Fixed

- `createDevSessionRoute` строил редирект от `request.url` — за Docker port-forward и NPM
  reverse-proxy это резолвится во внутренний bind-адрес контейнера (`http://0.0.0.0:<port>/...`,
  Next.js standalone слушает `0.0.0.0`), а не в клиентский host:port. Cookie сессии устанавливалась
  корректно, но браузер получал 307 на несуществующий `0.0.0.0` → `ERR_CONNECTION_REFUSED`. Найдено
  BlackCove на живом staging-прогоне grandslamcup. Теперь base URL резолвится из заголовков
  `x-forwarded-host`/`host` (`x-forwarded-proto` для схемы), с фолбэком на `request.url`, если
  заголовки отсутствуют.

## [0.8.0] - 2026-07-11

### `createDevSessionRoute` — переиспользуемый dev-only логин без OIDC для staging-e2e

**Added:**

- `createDevSessionRoute(options)` — фабрика Next.js route handler'а, создающего Better Auth
  сессию без пароля/OIDC для e2e-тестов и preview-аудита. Извлечено из grandslamcup (первого
  приложения со staging-e2e пайплайном, §18 PLAN.md) в общую библиотеку, чтобы следующие
  приложения не копипастили и не переизобретали защиту.
- Двойная защита от случайного открытия на реальном проде: явный флаг
  `process.env.ALLOW_DEV_SESSION === 'true'` + секретный `DEV_SESSION_TOKEN` (constant-time
  сравнение). `NODE_ENV === 'production'` НЕ используется как индикатор — production-билд
  Next.js (`next build`/`next start`, которым собирается и staging-образ) всегда выставляет
  `NODE_ENV=production` независимо от реального окружения, поэтому старая проверка была
  структурно сломана на staging.
- `DevSessionPrismaClient`, `CreateDevSessionRouteOptions` — публичные типы.

## [0.3.0] - 2026-05-30

### ResendVerificationButton + UX при SMTP-ошибке (Этап 1.4 auth-унификации)

**Added:**

- `ResendVerificationButton` — кнопка повторной отправки письма email-верификации
  - Тонкая обёртка над `authClient.sendVerificationEmail` (клиент передаётся пропом)
  - Встроенный cooldown с обратным отсчётом «Отправить повторно через {n} с»
  - **§13.4:** cooldown запускается ТОЛЬКО при успешной отправке; при ошибке кнопка
    остаётся доступной, пользователю показывается нейтральное сообщение (без деталей SMTP)
  - Колбэки `onSent` / `onError`
- `ResendCapableAuthClient`, `ResendVerificationButtonProps` — публичные типы

## [0.2.0] - 2026-01-19

### OAuth привязка аккаунтов + VK авторизация

Добавлены компоненты и хелперы для страницы управления связанными OAuth аккаунтами.

**Added:**

- `VKIcon` — SVG иконка ВКонтакте для OAuth кнопок
- `ConnectedAccountsList` — клиентский компонент для управления привязанными OAuth аккаунтами
  - Отображение статуса каждого провайдера (привязан/не привязан)
  - Кнопки привязки/отвязки аккаунтов
  - Карточка Email + пароль со статусом
  - Поддержка кастомного Telegram виджета через `telegramWidget` prop
  - Кастомные иконки через `providerIcons` prop
- `AccountCard` — карточка отдельного провайдера
- `createUnlinkAccountAction` — фабрика Server Action для отвязки OAuth аккаунтов
  - Проверка авторизации
  - Валидация: нельзя отвязать последний способ входа
  - Автоматическая revalidatePath
- `AccountBase` тип — базовый интерфейс для связанного аккаунта
- `UnlinkAccountResult` тип — результат операции отвязки

**Changed:**

- Расширен тип `OAuthProvider` — добавлен `'vk'`
- Обновлены `defaultProviderIcons` и `defaultProviderLabels` для VK
- Добавлен VK в `socialProviders` (Better Auth native provider)

**Technical:**

- Добавлен `"lib": ["ESNext", "DOM"]` в tsconfig.lib.json для поддержки DOM типов

---

## [0.1.0] - 2026-01-10

### Начальный релиз

**Added:**

- `createAuthClient` — создание базового Better Auth клиента
- `createAuthClientWithOAuth` — клиент с поддержкой genericOAuth (Yandex и др.)
- `OnlyFor` — компонент условного рендеринга по роли
- `SessionProvider` — провайдер сессии для React
- `createSessionHelpers` — хелперы для работы с сессией (getSession, getCurrentUser)
- `createAuthGuards` — guard функции для защиты роутов (requireAuth, requireRole, requireAdmin)
- `createAuthChecks` — функции проверки без редиректов (isAuthenticated, hasRole, isAdmin)
- Иконки провайдеров: `GoogleIcon`, `YandexIcon`, `GitHubIcon`, `TelegramIcon`
- `OAuthButtons` — компонент с кнопками OAuth провайдеров

---

**Последнее обновление:** 2026-01-19
