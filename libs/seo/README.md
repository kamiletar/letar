# @letar/seo

Гейт «прод или нет» для SEO-решений (индексация, `robots.ts`, dev-бэкдоры) — вынесен из
`apps/aboi/src/lib/seo.ts` (PLAN-INFRA.md §33 Часть A). `NODE_ENV` для этого не годится:
`next build` выставляет `production` и на staging-образе тоже (см.
[env-files.md](/.claude/rules/env-files.md)) — единственный надёжный сигнал — сверка реально
резолвнутого домена с известным боевым.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { isProductionDomain } from '@letar/seo'
```

## API

### `getBaseUrl(productionUrl: string): string`

`NEXT_PUBLIC_BASE_URL`, если задан, иначе `productionUrl` (используется, когда приложению нужен
сам базовый URL, а не только булев ответ — например для построения абсолютных ссылок).

### `isProductionDomain(productionUrl: string): boolean`

`true` только на боевом домене. Домен приложения передаётся параметром — библиотека сама не
хранит домены коммерческих приложений (публичный репозиторий, см.
[public-repo-hygiene.md](/.claude/rules/public-repo-hygiene.md)). Типичное использование в
`robots.ts` приложения:

```typescript
import { isProductionDomain } from '@letar/seo'

const PRODUCTION_URL = 'https://example.com' // приложение хранит свой домен само

export default function robots(): MetadataRoute.Robots {
  if (!isProductionDomain(PRODUCTION_URL)) {
    return { rules: { userAgent: '*', disallow: '/' } } // staging/dev — индексация закрыта
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${PRODUCTION_URL}/sitemap.xml`,
  }
}
```

⚠️ Без `NEXT_PUBLIC_BASE_URL` `getBaseUrl`/`isProductionDomain` падают обратно на `productionUrl`
(т.е. локальная разработка без переменной резолвится как «прод») — поведение унаследовано от
исходной реализации в `aboi`, не переосмыслено при выносе.

## Команды

```bash
nx test seo
nx lint seo
nx typecheck:tsgo seo
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/seo` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/seo` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
