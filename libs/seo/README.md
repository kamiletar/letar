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

### `breadcrumbJsonLd(baseUrl: string, items: BreadcrumbJsonLdItem[]): Record<string, unknown>`

`BreadcrumbList` JSON-LD (Schema.org) для навигации поисковиков. Вынесена из `apps/aboi` (§22
PLAN-INFRA.md) — была app-agnostic pure function, ждала только параметризации `baseUrl`.

```typescript
import { breadcrumbJsonLd } from '@letar/seo'

breadcrumbJsonLd('https://example.com', [
  { name: 'Главная', path: '/' },
  { name: 'Каталог', path: '/catalog' },
])
```

### `organizationJsonLd(params: OrganizationJsonLdParams): Record<string, unknown>`

`Organization` JSON-LD для главной страницы. `params: { name, url, description? }` — либа не
хранит бренд конкретного приложения.

⚠️ **`productJsonLd` сюда не вынесен.** При сравнении `aboi` (вариантные цены →
`AggregateOffer`/`Offer`) и `svoichuzhie` (простой `Offer` для мерча) форма `offers` расходится
по существу — общая функция была бы неправильной абстракцией (тот же вывод, что для
`estimatePackage()` в `@letar/cdek`, см. PLAN-INFRA.md §23). Каждое приложение пишет свой
`productJsonLd` локально.

## Команды

```bash
nx test seo
nx lint seo
nx typecheck:tsgo seo
```

## Общий sitemap-builder — вынос рассмотрен и отклонён

Аудит 2026-08-08: 18 приложений (`aboi`, `aira-web`, `animatrona-landing`, `aprel8008`,
`archetest`, `domwellbes`, `dsperevod`, `form-example`, `grandslamcup`, `kami`,
`kami-key-the-landing`, `letar-landing`, `mandala`, `pravda`, `studio`, `svoichuzhie`, `synth`,
`time`) имеют `src/app/sitemap.ts`. На первый взгляд однотипны (все возвращают
`MetadataRoute.Sitemap`), но при сравнении делятся на три группы с существенно разной логикой:

- **Статика без БД и без i18n** (`animatrona-landing`, `kami-key-the-landing`, `letar-landing`,
  `studio`, `synth`) — 2–6 захардкоженных записей. Тут «дублирование» — это буквально сама форма
  типа `MetadataRoute.SitemapEntry`, обёртка над ней ничего не сократит.
- **i18n с alternates** (`aira-web`, `archetest`, `kami`, `mandala`, `time`) — генерация URL на
  локаль различается по форме: одни держат `defaultLocale` без префикса и строят alternates через
  `Object.fromEntries`, другие — вложенным `for` с ручной сборкой объекта `languages`, третьи —
  `flatMap`. Стратегия резолва пути на локаль (`pathFor`/`getLocalizedUrl`) специфична для
  роутинга каждого приложения (`routing.defaultLocale` vs `localePrefix: 'as-needed'` vs фиксированный
  список без роутинга).
- **БД-driven** (`aboi`, `domwellbes`, `dsperevod`, `grandslamcup`, `pravda`, `svoichuzhie`,
  `aprel8008`) — набор моделей, `where`-условия и схема приоритетов свои у каждого;
  `grandslamcup` вдобавок вложен на три уровня (город → сущность), `svoichuzhie` подстраховывает
  каждый запрос через `.catch(() => [])`, `kami` — через `try/catch` вокруг Keystatic и Prisma.
  Общий обязательный кусок — вызов `db.<model>.findMany({ where: { isPublished: true }, select: {
slug, updatedAt } })` — это одна строка Prisma API, извлекать её в хелпер бессмысленно.

Единственный реально повторяющийся атом — резолв `BASE_URL` (env-переменная с фоллбэком на
домен). Он уже вынесен сюда как `getBaseUrl()` (см. выше) и используется тремя приложениями
(`aboi`, `aira-web`, `pravda`) через собственный `src/lib/seo.ts`; остальные приложения просто
дублируют `process.env.NEXT_PUBLIC_BASE_URL || 'https://...'` инлайн в `sitemap.ts` — это
кандидат на точечную замену на `getBaseUrl()` при следующей правке конкретного файла, а не повод
заводить новую абстракцию.

**Вывод:** новый `buildSitemap()`-хелпер не заводить. Расхождения в i18n-стратегии и наборе
сущностей у каждого приложения делают параметризованную обёртку сложнее, чем прямой код, который
она заменяет. Если вопрос поднимется снова — проверить, не сократилось ли число реальных паттернов
(например, если появится 3-е приложение с идентичной вложенной i18n-схемой `archetest`/`time`
— тогда стоит вынести именно `pathFor`/`getAlternates`-пару, не весь sitemap builder).

## Подключение к приложению

Обязательное — одно: добавь `@letar/seo` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/seo` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
