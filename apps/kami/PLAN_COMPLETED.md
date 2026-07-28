# Выполненные задачи — Kami

## Версия 0.33.0 — 152-ФЗ: CookieBanner+ConsentLog, consent-aware аналитика (2026-07-28)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8, сессия root-weaver). Страница
`/privacy` уже была, но не было ни cookie-баннера, ни `ConsentLog`, а Yandex Metrika/Umami грузились
безусловно, до согласия. Добавлено:

- `ConsentLog` в `schema.zmodel` + миграция (`prisma/migrations/20260728033244_add_consent_log`)
- `POST /api/consent`
- `CookieBanner`/`CookieSettingsButton` из `@letar/ui`
- `umami-script-consent.tsx`/`yandex-metrika-consent.tsx` — аналитика инициализируется только после
  `analytics: true` в согласии (слушают `kami:consent-change`, читают localStorage при монтировании)

## Версия 0.32.0 — Pressable-компоненты + тач-фидбек (2026-06-21)

### Что сделано

**Архитектура:**

- `pressable.tsx` → стал re-export из `@letar/ui` (удалена inline-реализация ~70 строк)
- `theme-provider.tsx` → `pressableConfig` из `@letar/ui` заменил inline `keyframes`+`globalCss`; `() => {}` → `() => undefined` (lint)
- Созданы `ui/button.tsx` (re-export `PressableButton as Button`) и `ui/app-link.tsx` (~27 строк, next-intl `Link` + `Pressable`)

**Компоненты переведены:**

- `nav-links.tsx` → `AppLink` (5 навигационных ссылок, удалён `Button asChild + Link`)
- `sign-in-button.tsx` → `Button` из `@/app/_components/ui/button`
- `mobile-menu.tsx` → `AppLink` для nav-пунктов + `Pressable` вокруг `Drawer.Trigger > IconButton` (бургер)
- `social-links.tsx` → `ExternalLink` (4 иконки: GitHub, Facebook, Telegram, Email)
- `projects/page.tsx` → `Pressable` вокруг demo/code кнопок (Server Component)
- `hero.tsx` — импорт из `@/app/_components/pressable` сохранён (работает через re-export)

**iOS-фикс:** `useEffect(() => { document.addEventListener('touchstart', () => undefined, { passive: true }) }, [])` в `theme-provider.tsx`

### Технические детали

- Typecheck: чистый (кроме 4 pre-existing ошибок: `unique symbol` + yandex-metrika)
- Lint: 1 pre-existing warning (`no-console` в другом файле), 0 errors
- `@letar/ui` 0.5.0: `nx typecheck ui` генерирует `.d.ts`, без этого tsgo не видит новые экспорты

---

Детальное описание всех реализованных фич.

## Версия 0.31.0 — Glassmorphism кнопки (2026-06-21)

### Chakra-theming: glassmorphism для outline-кнопок

- В `theme-provider.tsx` добавил стили в recipe `button` → variant `outline`:
  `bg: { base: 'white/15', _dark: 'transparent' }` + `backdropFilter: { base: 'blur(10px)', _dark: 'blur(8px)' }`
- Убрал дублирующие инлайн-стили с кнопок "Скачать" / "Все аудио" в `audio-page-client.tsx`
- Все `<Button variant="outline">` во всём приложении (57 файлов) теперь получают glassmorphism автоматически из рецепта

---

## Версия 0.10.0

### Реализовано

- Платформа для работы с контентом
- Управление знаниями

---

## Версия 0.28.0

### Фаза 7, Этап 1: Кросс-постинг Telegram + VK

- Модели SocialPlatform (тип, имя, enabled, config Json) и CrossPost (postSlug, platform, status, externalId/Url, error)
- Enum SocialPlatformType (8 платформ), CrossPostStatus (PENDING, PUBLISHED, FAILED)
- Сервис telegram.ts — публикация через Telegram Bot API с поддержкой прокси (tg-proxy.letar.best)
- Сервис vk.ts — публикация через VK API wall.post (v5.199)
- Server Actions: publishPost, retryPost, getPostPublications, getEnabledPlatforms
- Admin /social — таблица платформ с иконками, переключателем enabled, счётчиком публикаций
- Admin /social/logs — таблица CrossPost записей с фильтрами по статусу (PENDING/PUBLISHED/FAILED), пагинацией
- PublishButton — клиентский компонент на странице блог-поста (выбор платформ, публикация, статус)
- Пункт «Соцсети» в admin sidebar с иконкой Share2

---

**Последнее обновление:** 2026-03-21
