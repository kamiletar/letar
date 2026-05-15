# Обзор PWA Offline-First

Архитектура Progressive Web App для работы без интернета.

## Ключевые технологии

| Технология                 | Назначение                                       |
| -------------------------- | ------------------------------------------------ |
| **Service Worker**         | Кэширование статики (HTML, CSS, JS, изображения) |
| **TanStack Query**         | Кэширование данных API с автосинхронизацией      |
| **IndexedDB (idb-keyval)** | Персистентность Query Cache между сессиями       |
| **useSyncExternalStore**   | Синхронизация состояния между вкладками          |

---

## Стратегии кэширования по типу ресурса

| Тип ресурса               | Стратегия              | Причина                              |
| ------------------------- | ---------------------- | ------------------------------------ |
| HTML страницы             | Network First          | Актуальный контент, fallback из кэша |
| Статика (JS, CSS, шрифты) | Cache First            | Редко меняется, быстрая загрузка     |
| Изображения               | Stale While Revalidate | Показать сразу, обновить в фоне      |
| API запросы               | TanStack Query         | Управляется React Query              |

---

## Serwist и Turbopack

> **Serwist не поддерживает Turbopack** (Next.js 16+ по умолчанию).

Используй ручной Service Worker:

1. Создай `public/sw.template.js` с `SW_VERSION = '0.0.0'`
2. Создай `scripts/update-sw-version.mjs` для подстановки версии из `package.json`
3. Добавь `update-sw-version` target в `project.json` с `dependsOn` для build
4. Добавь `sw.js` в `.gitignore`

**Пример реализации:** `apps/pravda/`

---

## Архитектура данных

```
┌─────────────────────────────────────────────────────────────┐
│                        Браузер                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   React     │───▶│ TanStack    │───▶│  IndexedDB  │     │
│  │ Components  │    │   Query     │    │ (idb-keyval)│     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                               │
│         │                  │                               │
│         ▼                  ▼                               │
│  ┌─────────────────────────────────────────────────┐       │
│  │              Service Worker                      │       │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │       │
│  │  │ Cache   │  │ Cache   │  │ Cache           │  │       │
│  │  │ First   │  │ Network │  │ SWR             │  │       │
│  │  │ (JS,CSS)│  │ First   │  │ (Images)        │  │       │
│  │  └─────────┘  │ (HTML)  │  └─────────────────┘  │       │
│  │               └─────────┘                        │       │
│  └─────────────────────────────────────────────────┘       │
│                          │                                  │
└──────────────────────────│──────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Сервер    │
                    │  (API, DB)  │
                    └─────────────┘
```

---

## Потоки данных

### Онлайн режим

1. Компонент → TanStack Query → API запрос
2. Ответ → Query Cache → IndexedDB (персистентность)
3. Компонент получает данные из кэша

### Оффлайн режим (чтение)

1. Компонент → TanStack Query
2. Query смотрит в кэш (IndexedDB)
3. Возвращает кэшированные данные
4. Помечает как `stale` для обновления при онлайн

### Оффлайн режим (запись)

1. Компонент → useOfflineForm
2. Мутация добавляется в Sync Queue (IndexedDB)
3. UI обновляется оптимистично
4. При восстановлении сети → processQueue()
5. Синхронизация с сервером

---

## Что кэшировать

### Статика (Service Worker)

- HTML страницы (включая `/offline`)
- JavaScript, CSS бандлы
- Шрифты
- Изображения товаров
- `manifest.json`, иконки

### Данные (TanStack Query + IndexedDB)

**Кэшируем для просмотра оффлайн:**

- Каталог товаров
- История заказов пользователя
- Профиль, мерки, настройки
- Избранное, сравнения
- История платежей (без полных номеров карт)

**НЕ кэшируем:**

- `/auth/*` — авторизация
- Полные номера карт, CVV, платёжные токены
- Активные платёжные сессии
- Внешние ресурсы (CDN, аналитика)

---

## Зависимости

```bash
# TanStack Query v5
bun add @tanstack/react-query @tanstack/react-query-persist-client @tanstack/react-query-devtools

# ZenStack TanStack плагин
bun add @zenstackhq/tanstack-query

# IndexedDB
bun add idb-keyval

# Service Worker типы (dev)
bun add -D @types/serviceworker
```

---

## См. также

- [service-worker.md](service-worker.md) — SW стратегии
- [tanstack-query-offline.md](tanstack-query-offline.md) — TanStack Query offline
- [indexeddb.md](indexeddb.md) — IndexedDB с idb-keyval
