# `@letar/forms`: eager JSX на верхнем уровне модуля роняет `tsx`-скрипты

**Симптом:** `nx db:seed <app>` (и любой другой `tsx`-скрипт, транзитивно импортирующий
`@letar/forms` с RichText- или документными полями) падает:

```
ReferenceError: React is not defined
```

Стек указывает на файл библиотеки (`toolbar-config.tsx`, `lazy-component.tsx`,
`document-field-base.tsx` и т.п.), а не на код приложения. Внутри Next.js всё работает штатно —
баг проявляется только под `tsx`/Node.

## Root cause

Несколько мест в `@letar/forms` создавали JSX-элемент **на верхнем уровне модуля** — в момент
вызова функции при импорте, а не внутри `render`/JSX-callback:

- `libs/forms/src/lib/declarative/lazy-component.tsx` — `createLazyComponentBase(importFn,
<Skeleton .../>)`;
- `libs/forms/src/lib/declarative/form-fields/text/toolbar-config.tsx` — `TOOLBAR_CONFIG` со
  значениями `icon: <LuBold />` и т.д.;
- `libs/forms/src/lib/declarative/form-fields/document/*.tsx` — `createDocumentField({ icon:
<LuFileText /> })` и аналоги (9 файлов).

Next.js всегда собирает JSX через **automatic runtime** (`jsx-runtime`) независимо от значения
`tsconfig.json.compilerOptions.jsx` — сборщик (SWC) сам выбирает трансформ. Поэтому в приложении
эти файлы работали без `import React`.

`tsx` резолвит JSX-трансформ **по `tsconfig` вызывающего приложения** через esbuild. Пресет
Next.js-приложений (`tsconfig.next-app.json`) держит `"jsx": "preserve"` — это специально для
Next.js (он делает трансформ сам), но esbuild не понимает `"preserve"` как automatic runtime и
транспилирует такой JSX в **classic** `React.createElement(...)`. Без `import React` в
конкретном модуле — падение прямо на этапе импорта, до всякого рендера.

`TOOLBAR_CONFIG`/иконки документных полей реэкспортируются как **значения** из барреля
(`form-fields/index.ts` → `declarative/index.ts` → `@letar/forms`), а не только за ленивым
`import()` — поэтому модуль исполняется при обычном статическом импорте `@letar/forms`, в том
числе из `prisma/seed.ts`.

## Фикс

Не создавать JSX-элемент eagerly:

- `createLazyComponent` (`@letar/forms-react`, v0.3.2) принимает `fallback` как **фабрику**
  (`() => ReactNode`), не готовый элемент — вызывается только внутри `LazyWrapper` на клиенте.
  Chakra-обёртка (`@letar/forms`, v2.7.4) и оба места в `@letar/forms-shadcn` (v0.33.5) обновлены
  под новую сигнатуру.
- `ToolbarButtonConfig.icon` и `DocumentFieldConfig.icon` — теперь `ComponentType`, не
  `ReactNode`: конфиг хранит ссылку на компонент (`icon: LuBold`), а не готовый элемент.
  Инстанцирование (`<Icon />`/`<config.icon />`) — в `render`.

## Как проверить, не наступает ли этот же баг где-то ещё

Признак: `export const X = someFactory(<Component .../>)` или `export const X = { key: <Component
.../> }` — вызов функции/литерал объекта с JSX-аргументом на верхнем уровне модуля (не внутри
`function`/`render`/JSX-callback), значение которого реэкспортируется как значение (не
`export type`) из барреля публичного API библиотеки.

### Автоматизировано (2026-08-25) — `nx lint`, не ручной grep

Ручной прогон грепов ниже (оставлены для истории и fallback-диагностики) заменён таргетом
`eager-jsx-check`, подключённым к `lint` всех трёх библиотек — регресс ловится при каждом
`nx lint forms|forms-react|forms-shadcn`, не требует, чтобы кто-то вспомнил прогнать grep перед
релизом. Общая логика — новая plain-JS библиотека
[`@letar/eager-jsx-check`](/libs/eager-jsx-check/README.md), по образцу
[`@letar/theme-check`](/libs/theme-check/README.md). Три правила (JSX как значение свойства
объекта, top-level `const`-инициализатор, top-level аргумент вызова функции) + исключения
(JSDoc-комментарии, тернарники в т.ч. многострочные, `render:`/стрелочные функции-значения,
generic-типы вида `Array<Foo>`/`<TValue = unknown>`) — см. README библиотеки и её тесты
(`src/index.test.mjs`).

**Первый же прогон нашёл реальный, ещё не исправленный экземпляр этого бага** —
`libs/forms-shadcn/src/lib/fields/document-field-base.tsx` и `rich-text-toolbar-config.tsx` не
были переведены на `ComponentType` вместе с Chakra-версией (`@letar/forms` v2.7.4) и
`@letar/forms-react` (v0.3.2): `DocumentFieldConfig.icon`/`ToolbarButtonConfig.icon` оставались
`ReactNode`, 8 консьюмеров создавали иконку eagerly. Исправлено в `@letar/forms-shadcn` v0.33.6.

Ручные команды (fallback, если гейт почему-то недоступен):

```bash
grep -rnE ':\s*<[A-Z][A-Za-z0-9]*\s*/?>' --include="*.tsx" libs/forms/src libs/forms-react/src libs/forms-shadcn/src | grep -vE 'render:|=>'
grep -rnE '^(export )?const [A-Za-z_]+ = <[A-Z]' --include="*.tsx" libs/forms/src libs/forms-react/src libs/forms-shadcn/src
```

⚠️ Эти два грепа сами по себе шумные (ложные срабатывания на JSDoc-комментарии и тернарники) —
именно поэтому автоматизированный гейт выше не их прямая обёртка, а переработанная версия с
дополнительными исключениями, проверенными тестами.

## Проверено

- `nx db:seed domwellbes` — полный успешный прогон (RichText-поле в `schema.zmodel`).
- `nx db:seed mandala` — прошёл весь импорт `@letar/forms` (RichText в схеме), упал дальше на
  несвязанной ошибке БД (`EACCES` на `user.upsert`) — не относится к этому багу.
- `nx typecheck:tsgo`/`nx lint` на `forms`, `forms-react`, `forms-shadcn`, `forms-core` — зелёные.
