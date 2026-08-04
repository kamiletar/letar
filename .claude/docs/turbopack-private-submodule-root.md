# Turbopack + приватный submodule — "Could not find the Next.js package"

## Симптом

`nx dev <app>` для приложения, которое является отдельным git submodule (свой `.git`), падает:

```
⚠ Warning: Next.js ignored package.json in C:\web\letar because it is outside the current Git repository (C:\web\letar\apps\<app>).
 To use this directory, set `turbopack.root` in your Next.js config.

Error: Could not find the Next.js package (next/package.json)
Resolved from: C:\web\letar\apps\<app>\src\app
Filesystem root used for resolution: C:\web\letar\apps\<app>
```

## Причина

Turbopack определяет workspace root эвристикой на основе границ `.git`. У приватных submodule
(`aboi`, `driving-school`, `dsperevod`, `svoichuzhie`, `studio` и т.д.) свой `.git` внутри
`apps/<app>/` — Turbopack принимает эту границу за workspace root и отказывается резолвить
`node_modules`, хоистнутые Bun в корень монорепо (`C:\web\letar\node_modules`), потому что они
лежат "outside the current Git repository".

Обычные (не submodule) приложения монорепо этой проблеме не подвержены — у них нет собственного
`.git`, поэтому Turbopack сам поднимается до корня монорепо.

## Фикс

В `next.config.mjs` приложения явно указать `turbopack.root` на корень монорепо:

```js
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const nextConfig = {
  turbopack: { root: workspaceRoot },
  // ...остальной конфиг
}
```

⚠️ Если в конфиге уже был `turbopack: {}` (пустой объект) — недостаточно объявить константу
`workspaceRoot`, нужно реально проставить `root: workspaceRoot` внутри этого объекта. Если ключа
`turbopack` не было вообще — добавить его целиком.

## Где применено

`apps/studio`, `apps/dsperevod`, `apps/svoichuzhie`. При заведении нового приватного submodule
с Next.js — сразу добавлять этот `turbopack.root`, не дожидаясь падения `nx dev`.
