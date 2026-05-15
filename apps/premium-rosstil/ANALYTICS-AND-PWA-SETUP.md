# Настройка аналитики и PWA - Инструкция

**Дата:** 2025-11-25
**Статус:** ✅ Базовая конфигурация завершена

---

## ✅ Что уже сделано

### 1. Vercel Analytics

- ✅ Установлен `@vercel/analytics@1.5.0`
- ✅ Интегрирован в `app/layout.tsx`
- ✅ Автоматически отслеживает метрики производительности

**Никаких дополнительных действий не требуется** - аналитика заработает автоматически после деплоя на Vercel.

---

### 2. Sentry Error Tracking

- ✅ Установлен `@sentry/nextjs@10.27.0`
- ✅ Созданы конфигурационные файлы:
  - `sentry.client.config.ts`
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`
  - `src/instrumentation.ts`
- ✅ Интегрирован в `next.config.js`

**Требуется настройка:**

#### Шаг 1: Создайте проект в Sentry

1. Зарегистрируйтесь на https://sentry.io/
2. Создайте новый проект (выберите "Next.js")
3. Скопируйте DSN из настроек проекта

#### Шаг 2: Настройте переменные окружения

Добавьте в `.env` (или `.env.local`):

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@o0000000.ingest.sentry.io/0000000"
NEXT_PUBLIC_SENTRY_ENVIRONMENT="production"  # или "development"
SENTRY_ORG="your-org-slug"
SENTRY_PROJECT="your-project-slug"

# Опционально: для загрузки source maps (только для production builds)
SENTRY_AUTH_TOKEN="your-auth-token"
```

#### Шаг 3: Протестируйте интеграцию

После настройки переменных, запустите dev-сервер и проверьте, что ошибки отправляются в Sentry.

---

### 3. PWA (Progressive Web App)

- ✅ Установлен `@ducanh2912/next-pwa@10.2.9`
- ✅ Создан `public/manifest.json`
- ✅ Настроен service worker с offline support
- ✅ Добавлены PWA meta-теги в `app/layout.tsx`
- ✅ Настроено кэширование (NetworkFirst strategy)

**✅ Иконки созданы автоматически**

#### PWA иконки

Иконки для PWA уже созданы из `logo.svg` в следующих размерах:

- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

**Путь:** `apps/premium-rosstil/public/icons/`

**Как были созданы:**
Иконки автоматически сгенерированы из `src/app/_images/logo.svg` с помощью скрипта.

**Регенерация иконок:**
Если нужно обновить иконки (например, после изменения logo.svg):

```bash
bun run generate:pwa-icons
```

Или напрямую:

```bash
node scripts/generate-pwa-icons.mjs
```

#### PWA Screenshots

Скриншоты используются в install prompt для красивого отображения приложения.

**Генерация скриншотов:**

1. Запустите dev-сервер: `nx dev premium-rosstil`
2. В другом терминале выполните:

```bash
bun run generate:pwa-screenshots
```

Или с кастомным URL:

```bash
node scripts/generate-pwa-screenshots.mjs --base-url http://localhost:3000
```

**Что создаётся:**

- `screenshot-mobile-home.png` (540×720) — главная страница, мобильная версия
- `screenshot-mobile-catalog.png` (540×720) — каталог, мобильная версия
- `screenshot-desktop-home.png` (1280×720) — главная страница, десктоп
- `screenshot-desktop-catalog.png` (1280×720) — каталог, десктоп

Скрипт автоматически обновляет `manifest.json` с новыми скриншотами.

#### Push Notifications

Push-уведомления позволяют отправлять сообщения пользователям даже когда они не на сайте.

**Типы уведомлений:**

- `NEW_PRODUCT` — уведомление о новых товарах
- `ORDER_STATUS` — статус заказа (оформлен, отправлен, доставлен)
- `PROMOTION` — акции и скидки
- `CART_REMINDER` — напоминание о брошенной корзине

**Настройка:**

1. Сгенерируйте VAPID ключи:

```bash
npx web-push generate-vapid-keys
```

2. Добавьте в `.env`:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-public-key"
VAPID_PRIVATE_KEY="your-private-key"
VAPID_SUBJECT="mailto:your-email@example.com"
```

**Использование UI компонента:**

```tsx
import { PushNotificationToggle } from '@/app/_components/push-notification-toggle';

// Простой переключатель
<PushNotificationToggle />

// С настройками типов уведомлений
<PushNotificationToggle showPreferences />
```

**Отправка уведомлений из кода:**

```tsx
import { notifyCartReminder, notifyNewProduct, notifyOrderStatus, notifyPromotion } from '@/lib/push-notifications'

// Уведомление о статусе заказа
await notifyOrderStatus(userId, orderNumber, 'SHIPPED', 'Ваш заказ отправлен!')

// Уведомление о новом товаре (всем подписчикам)
await notifyNewProduct('Новое платье', '/catalog/product/123', imageUrl)

// Акция (всем подписчикам)
await notifyPromotion('Скидка 20%', 'На всю коллекцию!', '/catalog')

// Напоминание о корзине
await notifyCartReminder(userId, itemCount)
```

**Структура базы данных:**

- `PushSubscription` — хранит подписки пользователей с настройками
- `PushNotification` — логирует отправленные уведомления для аналитики

#### Структура директории после создания иконок

```
apps/premium-rosstil/public/icons/
├── icon-72x72.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-192x192.png
├── icon-384x384.png
└── icon-512x512.png
```

#### Тестирование PWA

1. Соберите production build: `nx build premium-rosstil`
2. Запустите production сервер
3. Откройте в Chrome DevTools > Application > Manifest
4. Проверьте, что manifest загружается корректно
5. Попробуйте установить PWA через меню браузера

---

## 🔍 Проверка работоспособности

### Vercel Analytics

После деплоя на Vercel:

1. Откройте Vercel Dashboard → Ваш проект → Analytics
2. Проверьте, что данные начали поступать

### Sentry

1. Вызовите тестовую ошибку в приложении
2. Проверьте, что она появилась в Sentry Dashboard → Issues

### PWA

1. Откройте сайт в Chrome на мобильном устройстве
2. Появится prompt "Установить приложение"
3. После установки проверьте offline режим (отключите интернет)

---

## 📚 Дополнительная документация

### Vercel Analytics

- https://vercel.com/docs/analytics

### Sentry

- https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Session Replay: https://docs.sentry.io/platforms/javascript/session-replay/
- Performance Monitoring: https://docs.sentry.io/platforms/javascript/performance/

### PWA

- Next.js PWA: https://ducanh-next-pwa.vercel.app/docs/next-pwa/getting-started
- Web App Manifest: https://developer.mozilla.org/en-US/docs/Web/Manifest
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

---

## 🎯 Что дальше?

### Опциональные улучшения:

1. **Sentry:**
   - Настроить custom dashboards
   - Добавить alerting (email/Slack) для critical errors
   - Интегрировать с GitHub Issues
   - Настроить user feedback widget

2. **PWA:**
   - ✅ Добавить screenshots в `manifest.json` для красивого install prompt
   - ✅ Настроить push notifications
   - ✅ Добавить "Add to Home Screen" prompt для iOS
   - ✅ Оптимизировать кэширование для specific routes

3. **Analytics:**
   - Настроить custom events tracking
   - Добавить conversion funnels
   - Настроить A/B testing (если потребуется)

---

**Версия:** 1.0
**Автор:** Claude Code
**Дата создания:** 2025-11-25
