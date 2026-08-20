# @letar/i18n-proxy

Хелпер для `matcher` в `config` `proxy.ts` next-intl-приложений — единообразно учитывает
metadata-роуты Next.js (`icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`, `twitter-image.tsx`),
которые отдаются **без расширения** в URL и поэтому не ловятся правилом «путь с точкой — статика»
(`.*\..*`). Без явного исключения next-intl middleware переписывает такой путь в несуществующий
локализованный (`/ru/apple-icon`) → 404. Паттерн выведен из ручного фикса `apps/studio/src/proxy.ts`
(первое приложение, где баг проявился на практике).

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { buildIntlMatcher, findUndeclaredMetadataRoutes } from '@letar/i18n-proxy'
```

## API

### `buildIntlMatcher(options?)`

Строит массив `matcher` для `config` в `proxy.ts`.

```typescript
// proxy.ts
import { buildIntlMatcher } from '@letar/i18n-proxy'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export default function proxy(request: NextRequest) {
  return intlMiddleware(request)
}

export const config = {
  matcher: buildIntlMatcher({
    excludePrefixes: ['api', '_next/static', '_next/image'],
    // metadata-роуты вне [locale], реально существующие в src/app — перечислять явно,
    // не полагаться на дефолт
    metadataRoutes: ['icon', 'apple-icon'],
  }),
}
```

- `excludePrefixes` — доп. префиксы вне `[locale]`, которые должны миновать intl-middleware
  (`api`, `trpc`, `admin`, `keystatic`, ...). Приложение указывает свой набор — унификации между
  приложениями библиотека не навязывает.
- `metadataRoutes` — подмножество `KNOWN_METADATA_ROUTE_STEMS` (`icon`, `apple-icon`,
  `opengraph-image`, `twitter-image`), которые реально есть в `src/app/` приложения вне
  `[locale]`. Список должен совпадать с тем, что передаётся в `findUndeclaredMetadataRoutes` в
  тесте (см. ниже) — иначе перечисление ничем не подтверждено.

### `findUndeclaredMetadataRoutes(appDir, declaredRoutes)`

Node-only (`fs`) проверка для unit-теста приложения — **не** для самого `proxy.ts`: он исполняется
в Edge Runtime, где `fs` недоступен. Сканирует `appDir` (обычно `src/app`) на файлы
`icon.tsx`/`apple-icon.png`/... на верхнем уровне и возвращает те, что физически существуют, но не
перечислены в `declaredRoutes` — то есть matcher их пропускает и next-intl даст на них 404.

```typescript
// src/proxy.spec.ts
import { findUndeclaredMetadataRoutes } from '@letar/i18n-proxy'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('proxy matcher', () => {
  it('перечисляет все metadata-роуты приложения явно', () => {
    const appDir = join(__dirname, 'app')
    const declared = ['icon', 'apple-icon'] // должно совпадать с proxy.ts

    expect(findUndeclaredMetadataRoutes(appDir, declared)).toEqual([])
  })
})
```

Падение теста означает: в `src/app/` появился новый `icon.tsx`/`apple-icon.tsx`/... вне
`[locale]`, а `metadataRoutes` в `proxy.ts` не обновили — тест ловит рассинхрон до прода, а не
после 404 в проде.

## Команды

```bash
nx test i18n-proxy
nx lint i18n-proxy
nx typecheck:tsgo i18n-proxy
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/i18n-proxy` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/i18n-proxy` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
