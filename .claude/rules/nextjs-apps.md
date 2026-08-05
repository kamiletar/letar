---
paths: 'apps/**/app/**/page.tsx, apps/**/app/**/layout.tsx, apps/**/app/**/route.ts, apps/**/next.config.*'
---

# Правила для Next.js приложений

## App Router (Next.js 16)

- Используй App Router (`app/` директория), не Pages Router
- Server Components по умолчанию, `'use client'` только когда нужно
- Server Actions в `_actions/` папках с суффиксом `.action.ts`
- Layouts в `layout.tsx`, loading states в `loading.tsx`

## Структура папок

```
app/
├── _actions/        # Server Actions
├── _components/     # Shared компоненты страницы
├── _hooks/          # Кастомные хуки
├── _schemas/        # Zod схемы валидации
├── (auth)/          # Группа роутов для аутентификации
├── admin/           # Админ-панель
└── api/             # API роуты
```

## Импорты

```typescript
// Используй path aliases
import { Component } from '@/app/_components/Component'
import { schema } from '@/app/_schemas/my-schema'

// Не используй относительные пути для глубоких импортов
// ❌ import { x } from '../../../_components/x'
```

## Метаданные

```typescript
// Статические метаданные
export const metadata: Metadata = {
  title: 'Страница',
  description: 'Описание',
}

// Динамические метаданные
export async function generateMetadata({ params }): Promise<Metadata> {
  return { title: `Товар ${params.id}` }
}
```

## ⛔ Один `next.config.*` на приложение

Next ищет конфиг строго по порядку `next.config.js` → `.mjs` → `.ts` (`CONFIG_FILES` в
`next/dist/shared/lib/constants.js`) и берёт **первый найденный**, молча игнорируя остальные.
Но `@nx/next/plugin` при построении графа читает **свой** — так что второй файл не безобиден:
`throw` внутри него валит `nx build` целиком, хотя сама сборка этот файл не применяет.

Прецедент (2026-08-05): у `dashboard` лежали и `next.config.js`, и `next.config.ts` с
расходящимися списками `transpilePackages` и `optimizePackageImports`; `.ts` был написан позже и
не применялся вовсе. Проверяется маркером — `console.log` в каждом файле и один `nx build`:
печатается ровно один.

Заводишь конфиг — правь существующий, не создавай второй в другом расширении.

⚠️ `optimizePackageImports` в Next 16 — по-прежнему **внутри `experimental`**
(`ExperimentalConfig` в `next/dist/server/config-shared.d.ts`). На верхнем уровне Next его просто
не видит. Ошибка встречалась дважды: в мёртвом `dashboard/next.config.ts` и в живом
`auth-hub/next.config.ts`.

## Правила

- **MUST** использовать App Router, **NEVER** Pages Router
- **MUST** использовать `proxy.ts` вместо `middleware.ts` (Next.js 16)
- **SHOULD** Server Components по умолчанию
- **NEVER** использовать относительные пути для глубоких импортов
- **MUST** `export const dynamic = 'force-dynamic'` на публичной странице, показывающей данные,
  редактируемые через админку этого же приложения (каталоги, списки объявлений/товаров/карточек).
  Без этого Next.js App Router по умолчанию делает SSG — запекает список на этапе `next build`, и
  более поздние изменения в БД (включая сид с демо-данными, который `deploy-affected.sh` выполняет
  ПОСЛЕ билда: `migrate → build → seed`) не отражаются на сайте без полного ребилда. Поймано дважды
  на одной и той же ошибке: `apps/aboi/src/app/[locale]/catalog/page.tsx` и
  `apps/domwellbes/src/app/houses/page.tsx` + `houses/[slug]/page.tsx` (`/houses` показывал «0
  домов» даже после успешного сида).

## Документация

→ **Skill: `nextjs-expert`** — паттерны Next.js 16
→ **Skill: `better-auth`** — аутентификация
→ Используй `next-devtools` MCP для актуальной документации
