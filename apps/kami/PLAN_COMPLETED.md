# Выполненные задачи — Kami

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
