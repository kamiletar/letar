# Webpack не эмиттит wasm-бинарник Emscripten-обвязки, если путь к нему runtime-строка

## Симптом

`next build --webpack` компилируется без ошибок («Compiled successfully»), но при пререндере
статического route, использующего библиотеку с Emscripten-glue (`harfbuzzjs`, и в целом любой
пакет вида `*.js` + рядом лежащий `*.wasm`, загружаемый через сгенерированный emscripten-раннер),
падает во время «Generating static pages»:

```
failed to asynchronously prepare wasm: Error: ENOENT: no such file or directory,
open '.next/server/chunks/<имя>.wasm'
Aborted(Error: ENOENT: ...). Build with -sASSERTIONS for more info.
```

Билд не останавливается (ошибка перехватывается на уровне конкретного route), но:

- при статическом route (SSG) — конкретная страница остаётся без сгенерированного вывода;
- при полностью динамическом route (SSR/on-demand, наш случай — `next/og`
  `opengraph-image.tsx`) — то же исключение будет брошено уже на **реальном запросе** в проде,
  а не на билде: `.next/server/chunks/<имя>.wasm` в готовом образе просто не существует.

## Причина

Emscripten генерирует JS-обвязку (`hbjs.js` у harfbuzzjs), которая ищет свой `.wasm`-файл **по
строковому runtime-пути** рядом с собой (`readAsync`/`fetch` от вычисленного на лету пути), а не
через статический `import`/`require`. Webpack анализирует граф зависимостей статически — паттерн
runtime-конкатенации пути он не распознаёт как asset-зависимость, поэтому:

- JS-обвязка компилируется и попадает в чанк нормально;
- сам `.wasm`-бинарник **не копируется** в output вообще, хотя в исходном `node_modules` он есть.

`serverExternalPackages` (бывший `experimental.serverComponentsExternalPackages`) не чинит —
проблема не в бандлинге JS-кода как такового, а в отсутствии копирования ассета.

## Воспроизведено и починено

`apps/grandslamcup` — единственное приложение монорепо, где `satori` (root-level зависимость,
`package.json` корня) импортируется **напрямую** в коде приложения
(`src/lib/telegram/poster/render.ts`, рендер постеров для Telegram). `satori@0.33.4` зависит от
`harfbuzzjs` для text shaping. Остальные приложения с `opengraph-image.tsx`/`icon.tsx` используют
`next/og` (`ImageResponse` из пакета `next`) — эта реализация бандлит собственные wasm-ассеты
(`resvg.wasm`, `yoga.wasm`) внутри `next/dist/compiled/@vercel/og` и копируется штатно, паттерн их
не касается.

**Воспроизведено детерминированно** в изолированной локальной пересборке (без параллельных билдов
других приложений — не гонка за общий `node_modules`), 5 итераций до финального чистого билда.

## Фикс

Ручное копирование wasm-файла в `.next/server/chunks` после сборки серверного webpack-компилятора,
через `compiler.hooks.afterEmit`:

```js
// next.config.mjs
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

webpack: ;
;((config, { isServer }) => {
  if (isServer) {
    config.plugins.push({
      apply(compiler) {
        compiler.hooks.afterEmit.tapPromise('CopyHarfbuzzWasm', async () => {
          const { copyFile } = await import('node:fs/promises')
          const path = await import('node:path')
          // библиотека — транзитивная зависимость satori, не своя dependency приложения;
          // require.resolve с paths от satori находит её в изолированном дереве bun
          const wasmSrc = require.resolve('harfbuzzjs/hb.wasm', {
            paths: [path.default.dirname(require.resolve('satori/package.json'))],
          })
          const outputPath = path.default.basename(compiler.outputPath) === 'chunks'
            ? compiler.outputPath
            : path.default.join(compiler.outputPath, 'chunks')
          try {
            await copyFile(wasmSrc, path.default.join(outputPath, 'hb.wasm'))
          } catch (err) {
            if (err.code !== 'ENOENT') { throw err // edge/middleware-проход — каталога может не быть
             }
          }
        })
      },
    })
    return config
  }
  return config
})
```

`compiler.outputPath` для основного серверного компилятора уже указывает на `.../server/chunks`;
для edge/middleware-прохода — на другой путь, поэтому проверка на `basename === 'chunks'` и
проглатывание `ENOENT` на назначении обязательны.

## Ловушка при тестировании фикса

`require.resolve('<пакет>/package.json')` без `paths` падает с `Cannot find module`, если пакет —
транзитивная (не собственная) зависимость приложения под bun isolated linker: он не резолвится
напрямую из контекста приложения. Резолвить через `paths` от пакета, который его реально требует
(здесь — `satori`), а не от корня приложения.

## Применимость к другим приложениям

Паттерн специфичен для monorepo-приложений, где root-level пакет с Emscripten-wasm-зависимостью
(`satori`/`harfbuzzjs` — не единственный пример; любой `*.wasm`-пакет с похожей раннер-обвязкой:
resvg-wasm вне `next/og`, некоторые image/audio wasm-кодеки) импортируется **напрямую в коде
приложения**, а не только через встроенную конвенцию `next/og`. На 2026-09-05 такой прямой импорт
`satori` — только в `grandslamcup`.
