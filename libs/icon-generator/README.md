# @letar/icon-generator

Общая логика генерации иконок Electron-приложений (PNG нескольких размеров + Windows `.ico`) из
одного `resources/icon.svg`. Раньше была независимо продублирована в `animatrona`,
`label-printer-desktop`, `poster-microtext-desktop` — до расхождения оставался один
неосторожный `git diff`: `label-printer-desktop` тянул неустановленную зависимость
`@resvg/resvg-js`, а `animatrona` (CommonJS) падал на `require('png-to-ico')` — ESM-пакет отдаёт
`{ default: fn }`, а не саму функцию.

## Почему plain JS (`.mjs`), а не TypeScript как остальные библиотеки монорепо

Скрипт `apps/<app>/scripts/generate-icons.mjs` запускается напрямую через
`node scripts/generate-icons.mjs`, вручную, без бандлера и без `tsc`/`tsgo`. Резолв
`@letar/*`-библиотек через `paths`/`customConditions` работает только внутри TypeScript-
инструментов — голый `node` его не видит и резолвит `@letar/icon-generator` по обычным правилам
Node (`package.json#exports` через симлинк в `node_modules`, который создаёт `bun install` для
пакета из `nx.implicitDependencies` приложения). Экспортируемый код должен быть исполняемым JS
сразу, без шага компиляции. Тот же паттерн и то же обоснование — `@letar/theme-check`,
`@letar/eager-jsx-check`.

## API

```js
import { DEFAULT_ICO_SIZES, DEFAULT_SIZES, generateIcons } from '@letar/icon-generator'
import { readFileSync } from 'node:fs'

await generateIcons({
  svgBuffer: readFileSync('resources/icon.svg'),
  outDir: 'resources',
  log: console.log,
})
```

- **`generateIcons(options)`** — рендерит `sizes` PNG (`icon-<size>.png`), основной `icon.png`
  (`mainIconSize`, по умолчанию 256 — используется на Linux) и `icon.ico` (Windows, собирается
  из PNG размеров `icoSizes`). Возвращает пути к созданным файлам.
- `DEFAULT_SIZES`, `DEFAULT_ICO_SIZES`, `DEFAULT_MAIN_ICON_SIZE` — дефолты, покрывающие
  Windows/macOS/Linux.

Рендерит через `sharp` (единый движок вместо разошедшихся `sharp`/`@resvg/resvg-js` по трём
приложениям) и `png-to-ico`. Для macOS `.icns` инструмента здесь нет — оставлен
`cloudconvert.com/png-to-icns` за отсутствием кроссплатформенной npm-библиотеки, применимой
из коробки.

## Использование в приложении

Тонкий CLI-скрипт `apps/<app>/scripts/generate-icons.mjs`:

```js
import { generateIcons } from '@letar/icon-generator'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const resourcesDir = join(__dirname, '..', 'resources')

await generateIcons({
  svgBuffer: readFileSync(join(resourcesDir, 'icon.svg')),
  outDir: resourcesDir,
  log: console.log,
})
console.log('\nИконки сгенерированы!')
```

Приложение обязано перечислить `@letar/icon-generator` в `nx.implicitDependencies` своего
`package.json` — иначе `bun install` не создаст симлинк в `node_modules` и `import` не
разрешится (см. [libs.md § Подключение к приложению](/.claude/rules/libs.md)).
