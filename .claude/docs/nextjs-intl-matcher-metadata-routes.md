# next-intl matcher должен явно перечислять metadata-роуты без расширения

## Симптом

Публичный metadata-роут Next.js (`icon`, `apple-icon`, `opengraph-image`, `twitter-image`) отдаёт
404 под локалью (`/ru/icon`), хотя сам файл (`icon.tsx`/`icon.svg`/`icon.png`/...) присутствует и
маршрут вне `[locale]`.

## Причина

Next.js metadata route convention (`icon`/`apple-icon`/`opengraph-image`/`twitter-image`) отдаёт
финальный URL **без расширения** независимо от исходного файла — и для сгенерированных
(`icon.tsx`) и для статичных (`icon.png`, `icon.svg`): кэш-бастинг идёт через query
(`/icon?<hash>`), а не через имя файла. Только `favicon.ico` — исключение, сохраняет `.ico` в URL.

Типичный matcher next-intl middleware исключает статику правилом «путь с точкой — файл»
(`.*\..*`). Это правило не ловит metadata-роуты именно потому, что в их URL точки нет — middleware
применяется к ним как к обычной странице и переписывает путь в несуществующий локализованный
(`/ru/icon`) → 404.

## Ловушка при ручном аудите

Естественная (и ошибочная) эвристика — «файл с расширением в имени, значит в URL тоже будет точка,
значит уже отфильтрован». Это неверно именно для четырёх упомянутых конвенций: расширение
файла-источника (`.svg`, `.png`, `.tsx`) не переносится в URL. На 2026-08-21 эта ошибка дважды
привела к ложноотрицательному аудиту («баг не подтвердился») для приложений, у которых
`icon.svg`/`icon.png`/`apple-icon.png` физически лежали в `src/app/` месяцами незамеченными —
разбор по каждому приложению в `apps/<app>/PLAN_COMPLETED.md` (kami, time, aboi).

`favicon` — не подвержена: остаётся `favicon.ico` в URL, единственная из пяти конвенций.

## Фикс

`@letar/i18n-proxy` (`libs/i18n-proxy`):

```typescript
import { buildIntlMatcher } from '@letar/i18n-proxy'

export const config = {
  matcher: buildIntlMatcher({
    excludePrefixes: ['api', '_next/static', '_next/image'], // свой набор на приложение
    metadataRoutes: ['icon', 'apple-icon'], // те, что реально есть в src/app/ вне [locale]
  }),
}
```

`metadataRoutes` перечисляется руками, не угадывается автоматически — тем самым принимается
конкретное решение о том, что реально есть в приложении, а не молчаливое предположение.

Второй компонент библиотеки — `findUndeclaredMetadataRoutes(appDir, declaredRoutes)`, Node-only
(`fs`) проверка для unit-теста приложения (не для самого `proxy.ts`: он исполняется в Edge Runtime,
где `fs` недоступен):

```typescript
// src/proxy.spec.ts
import { findUndeclaredMetadataRoutes } from '@letar/i18n-proxy'

it('перечисляет все metadata-роуты приложения явно', () => {
  expect(findUndeclaredMetadataRoutes(join(__dirname, 'app'), ['icon', 'apple-icon'])).toEqual([])
})
```

Тест ловит появление нового `icon.tsx`/`apple-icon.png`/... вне `[locale]` без обновления matcher
— до прода, а не после 404 в проде, и без необходимости в ручном аудите каждый раз.

## Где применено

Все 7 приложений с next-intl в `proxy.ts`: `studio` (первое, вручную), `archetest`, `time`,
`mandala`, `kami`, `aira-web`, `aboi`. Подробности API — [libs/i18n-proxy/README.md](/libs/i18n-proxy/README.md).
