# Next.js 16 static export: расхождение путей RSC-сегментов ломает клиентскую навигацию

## Симптом

Приложение собрано с `output: 'export'` (статический экспорт, без Node.js-сервера — только nginx
отдаёт файлы). Клиентская навигация между страницами через `<Link>`/`router.push()` не срабатывает
или ведёт не туда: URL после клика не меняется (остаётся на исходной странице) либо контент не
обновляется, хотя прямой переход по адресной строке на ту же страницу работает нормально.

В DevTools Network видны 404 на запросы вида `__next/<section>/__PAGE__.txt` (или похожие
`.txt`-файлы с RSC-payload) в момент prefetch/навигации — сами 404 не роняют страницу, но
отключают prefetch и ломают последующую клиентскую навигацию.

## Причина

Известный баг апстрима: [vercel/next.js#85374](https://github.com/vercel/next.js/issues/85374).

Next.js 16 ввёл Cache Components — фича меняет способ фетча RSC **всегда**, даже если сама фича не
используется явно: вместо одного файла на сегмент запрашиваются несколько частей
(`__next._tree.txt`, `__next._head.txt`, `__next._index.txt` и т.д.). При `output: 'export'` эти
файлы пишутся на диск **вложенными директориями** (`__next/section/__PAGE__.txt`), а клиентский
роутер во время prefetch/навигации запрашивает их **плоским, dot-separated именем**
(`__next.section.__PAGE__.txt`) — путь на диске и путь в запросе расходятся. Причина расхождения —
разъезжающаяся логика построения пути между клиентским роутером и билд-выводом (упоминается баг с
Windows-специфичным поведением, но воспроизводится и на Linux-сборках в этом монорепо).

PR-фикс апстрима (#86948) на момент находки (2026-07-21) не был смёржен.

## Диагностика

1. Собрать приложение (`next build` с `output: 'export'`) и заглянуть в `out/<путь>/` — если там
   есть одновременно директория `__next.<нечто>/` (с файлами внутри) и НЕ рядом плоский файл
   `__next.<нечто>.txt` — на диске лежит вложенная структура, а роутер её не найдёт.
2. В DevTools Network при клике по внутренней ссылке искать 404 на пути, содержащие `__next` и
   `_rsc=` в query.
3. Если 404 подтвердились — это баг #85374, не логическая ошибка в коде навигации приложения.

## Фикс

Next.js 16 поддерживает build adapters (`adapterPath` в `next.config`) — хук
`onBuildComplete`, который может переименовать файлы после сборки в путь, который ожидает роутер.

```js
// build/adapter.js (CommonJS — next.config обычно ESM, adapter грузится отдельно)
const fs = require('fs')
const path = require('path')

/** @type {import('next').NextAdapter} */
const adapter = {
  name: 'fix-issue-85374',
  async onBuildComplete({ outputs }) {
    for (const file of outputs.staticFiles) {
      const targetPath = fixupPath(file.filePath)
      if (targetPath) {
        await fs.promises.rename(file.filePath, targetPath)
      }
    }
  },
}

function fixupPath(filePath) {
  const components = filePath.split(path.sep)
  const idx = components.findIndex((x) => x.startsWith('__next.'))
  if (idx >= 0 && idx < components.length - 1) {
    const result = components.slice(0, idx)
    result.push(components.slice(idx).join('.'))
    return result.join(path.sep)
  }
  return null
}

module.exports = adapter
```

```js
// next.config.mjs
import { fileURLToPath } from 'node:url'

const nextConfig = {
  output: isProduction ? 'export' : undefined,
  ...(isProduction && { adapterPath: fileURLToPath(new URL('./build/adapter.js', import.meta.url)) }),
}
```

`adapterPath` — top-level ключ конфига в установленной в этом монорепо версии Next.js (не под
`experimental`, как в некоторых источниках/канареечных версиях — проверяй фактическую версию перед
копипастой).

## Проверка фикса

`next build` должен вывести `Running onBuildComplete from fix-issue-85374` в логе. В `out/`
рядом с вложенной (теперь пустой) директорией `__next.<section>/` должен появиться плоский файл
`__next.<section>.<...>.txt`. Проверять именно наличие плоского файла на диске — это гарантирует
совпадение с тем, что реально запросит браузер, без необходимости поднимать полноценный сервер.

⚠️ Если после фикса адаптера e2e-тест на клиентскую навигацию всё ещё падает — не считай это
автоматически провалом фикса. На `pravda` (см. ниже) сетевой уровень был подтверждён рабочим
(`curl`/ad-hoc Playwright-скрипт получали 200 на все RSC-запросы с плоскими путями), а тестовый
фреймворк (`@playwright/test` с `devices['Desktop Firefox']` эмуляцией) продолжал ловить свой,
отдельный баг — не полагайся на статус e2e-теста как единственный сигнал, проверяй сеть напрямую.

## Известные случаи в монорепо

- **`pravda`** (2026-07-21, PLAN.md §18.7 batch2) — единственное приложение монорепо на
  `output: 'export'`. `navigation.spec.ts` («Клиентская навигация (RSC)») падал на переходах между
  статьями (`/codes/tax/` → `/codes/family/`). Фикс — `apps/pravda/build/adapter.js` +
  `adapterPath` в `next.config.mjs`. Подтверждено BlackCove ad-hoc Playwright-скриптом (не
  `@playwright/test`) — RSC-запросы возвращают 200 с плоскими путями, реальная навигация для
  пользователей работает. Сам e2e-тест продолжил падать по отдельной, не связанной причине
  (тестовая обвязка, не диагностировано до конца на момент записи).
