# Changelog

## 0.5.9 (2026-08-24)

### Fixed

- `POST /api/cron/notifications` проверял заголовок `Authorization: Bearer` вместо стандартного
  `X-Cron-Secret`, которым `dashboard-agent` реально авторизует cron-вызовы (`executeJob` в
  `apps/dashboard-agent/src/lib/cron.ts`) — задача валилась 401 каждую минуту с 22.08.2026.
  Заменено на `verifyCronSecret()` из `@letar/api-server`, как в остальных приложениях
  (`driving-school:cleanup-api-logs` — образец).

## 0.5.7 (2026-08-21)

### Fixed

- `config.matcher` в `proxy.ts` заменён с вызова `buildIntlMatcher()` на литерал массива — Next.js
  статически парсит `config.matcher` через AST на build-time без исполнения модуля, вызов функции
  ломал `next build`.

## 0.5.5 (2026-08-19)

### Изменено

- Применён `Pressable` из `@letar/ui` к 3 главным CTA («Войти», «Сохранить», «Создать подписку») —
  конфиг темы был подключён со скаффолда, но не использовался. Т.к. в приложении не было ни одной
  solid-залитой кнопки (весь стиль — outline/ghost, а ripple `Pressable` не виден на таких
  поверхностях), эти три кнопки переведены на `colorPalette="brand" variant="solid"`. `globalCss`
  темы сужен до точечного `touchAction: manipulation`.

## 0.5.4 (2026-08-19)

### Исправлено

- Деплой падал в crash-loop: `Cannot find module '.../@swc/helpers/esm/_interop_require_default.js'`
  (`MODULE_NOT_FOUND`). Трейсер `standalone`-сборки (`@vercel/nft`) не докопировал `@swc/helpers`
  в `.next/standalone` при первом полном ребилде — тот же класс бага, что чинили в `aboi`
  (`nextjs-standalone-tracing.md`). `outputFileTracingIncludes` в `next.config.js` с сужённым
  глобом `node_modules/@swc/helpers/**/*` внутри bun-директории пакета.

## 0.5.3 (2026-08-19)

### Исправлено

- Бесконечный редирект на `/sign-in` после успешного входа через Ключницу. `signInWithLetarAuth()`
  вызывался без явного `callbackURL` — дефолт берёт текущий URL страницы, а на `/sign-in` это
  всегда сама `/sign-in`. Тот же баг, что был найден и исправлен в `studio` (см. корневой
  `PLAN.md` §41 addendum). `callbackURL` теперь передаётся явно.

## 0.2.0 (2026-03-21)

### Добавлено

- Страница «Который час?» — порядковый час от начала UNIX эпохи
- Поддержка RU/EN (автодетект через navigator.language)
- Порядковые числительные на русском (numeralize-ru)
- Обновление каждые 10 секунд
- Красивые числа (кратные 1000) показываются в альтернативном формате

## 0.1.0 (2026-03-21)

### Добавлено

- Инициализация приложения (Next.js 16, Chakra UI v3)
- Кастомная тема (brand: синий, accent: фиолетовый, dark mode)
- MDX поддержка
- Umami аналитика
- Vitest конфигурация
