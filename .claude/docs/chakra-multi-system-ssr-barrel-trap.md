# Импорт из барреля с `createSystem()` в Server Component роняет SSR

## Симптом

Приложение с несколькими Chakra-системами (например разные темы под разные группы роутов)
падает на SSR с ошибкой, которая не указывает ни на файл темы, ни на Server/Client границу:

```
TypeError: {imported module .../@ark-ui/react/dist/components/accordion/accordion.anatomy.js}.accordionAnatomy.extendWith is not a function
```

Причина — конфликт версий `@ark-ui/react` при повторном создании Chakra-системы вне
клиентского дерева. Ошибка появляется, даже если сам файл, из которого сделан импорт, никакого
`ChakraProvider` не рендерит и рендер вообще не запускает — достаточно, что модуль
**исполнился**.

## Причина

Модуль темы совмещает в одном файле создание системы и не связанный с ним побочный экспорт
(шрифты, константы):

```ts
// theme/phosphor/index.ts
import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const phosphorConfig = defineConfig({ theme: { tokens, semanticTokens } })

export const phosphorSystem = createSystem(defaultConfig, phosphorConfig)

export { departureMonoFont, phosphorFontStack, vgaFont } from './fonts'
```

JS-модуль исполняется **целиком** при импорте любого его именованного экспорта — не только
того, что реально используется. `import { vgaFont } from '@/theme/phosphor'` тянет за собой
исполнение всего файла, включая `createSystem(...)` на верхнем уровне, даже если `phosphorSystem`
нигде в этом импорте не упомянут.

Пока импорт происходит внутри клиентского дерева (`'use client'`-компонент), это безобидно —
`createSystem()` там и должен вызываться, ровно один раз, в компоненте, обёрнутом в
`RootChakraProvider` из `@letar/chakra-provider`. Проблема — когда тот же баррель импортирует
**Server Component** (файл без `'use client'`), например `layout.tsx`, которому нужны только
шрифтовые CSS-переменные:

```tsx
// app/(public)/layout.tsx — Server Component, БЕЗ 'use client'
import { departureMonoFont, vgaFont } from '@/theme/phosphor' // ❌ тянет весь index.ts

export default function PublicLayout({ children }) {
  return <Box className={`${vgaFont.variable} ${departureMonoFont.variable}`}>{children}</Box>
}
```

`createSystem()` выполняется вне клиентского дерева, на серверной стороне — и здесь ловит
конфликт версий `@ark-ui/react` (`accordionAnatomy.extendWith is not a function`), роняя SSR
всей страницы.

«Мне нужен только шрифт из этого файла» не защищает от побочного эффекта в том же файле —
защищает только то, **откуда** сделан импорт (клиентский код vs Server Component), а не то,
какой конкретно экспорт запрошен.

## Неправильно

```ts
// theme/phosphor/index.ts
export const phosphorSystem = createSystem(defaultConfig, phosphorConfig)
export { departureMonoFont, phosphorFontStack, vgaFont } from './fonts'
```

```tsx
// app/(public)/layout.tsx — Server Component
import { vgaFont } from '@/theme/phosphor' // исполняет createSystem() на сервере → 500
```

## Правильно

Шрифты (и любые другие константы, которые может понадобиться дёрнуть из Server Component)
вынесены в отдельный файл без побочных эффектов — `createSystem()` в нём не вызывается:

```ts
// theme/phosphor/fonts.ts — только localFont(), никакого createSystem()
export const vgaFont = localFont({ src: '...', variable: '--font-vga' })
export const departureMonoFont = localFont({ src: '...', variable: '--font-departure' })
export const phosphorFontStack = 'var(--font-vga), var(--font-departure), ui-monospace, monospace'
```

```ts
// theme/phosphor/index.ts — реэкспорт для клиентского кода, createSystem() остаётся тут
export const phosphorSystem = createSystem(defaultConfig, phosphorConfig)
export { departureMonoFont, phosphorFontStack, vgaFont } from './fonts'
```

```tsx
// app/(public)/layout.tsx — Server Component, импорт напрямую из fonts.ts, МИМО index.ts
import { departureMonoFont, vgaFont } from '@/theme/phosphor/fonts'
```

Система по-прежнему создаётся один раз, только внутри клиентского провайдера:

```tsx
// _components/public-providers.tsx
'use client'
import { phosphorSystem } from '@/theme/phosphor'
import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'

export function PublicProviders({ children }) {
  return (
    <ColorModeProvider forcedTheme="dark">
      <RootChakraProvider value={phosphorSystem}>{children}</RootChakraProvider>
    </ColorModeProvider>
  )
}
```

## Общее правило

Если приложение или библиотека заводит несколько Chakra-систем (разные группы роутов, разные
темы) — любой файл, вызывающий `createSystem()`, физически не должен совмещать в себе ничего,
что может понадобиться Server Component напрямую (шрифты, токены-константы, строки и т.п.).
Такие вещи выносятся в отдельный файл без побочных эффектов сразу при заведении модуля — не
постфактум, когда SSR уже упал. Барреля с `createSystem()` для Server Component как бы не
существует: импортировать из него можно только внутри `'use client'`-дерева.

## Где наступили

`apps/studio` (submodule `letar-private-studio`), редизайн публичной части, 2026-08-19 — дважды
на одном и том же механизме:

1. **Э2** — `Providers`-компонент рендерил сырой `ChakraProvider` из `@chakra-ui/react` без
   `'use client'` вместо `RootChakraProvider` из `@letar/chakra-provider` — тот же симптом
   (`accordionAnatomy.extendWith is not a function`), причина не в барреле, а в отсутствии
   `'use client'` на самом провайдере.
2. **Э3** (коммит `f35dbb6`) — `app/(public)/layout.tsx`, Server Component, импортировал
   `vgaFont`/`departureMonoFont` из барреля `@/theme/phosphor` ради шрифтовых CSS-переменных;
   баррель заодно исполнил `createSystem()`. Фикс — импорт напрямую из
   `@/theme/phosphor/fonts`, в обход `index.ts`.

Подробности и хронология — `apps/studio/REDESIGN_PLAN.md` (разделы Э0.1, Э2, Э3, поиск по
`accordionAnatomy`) и `apps/studio/PLAN_COMPLETED.md`.
