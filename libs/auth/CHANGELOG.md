# Changelog

Все изменения библиотеки @letar/auth документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
версионирование следует [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

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
