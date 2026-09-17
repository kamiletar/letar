# sharp/librsvg: `font-family`/`@font-face` игнорируются, текст рендерится системным шрифтом

⚠️ Применимо к любому SVG, рендерящемуся через `sharp` (librsvg под капотом) — не специфично
для одного приложения; соседняя, но другая ловушка того же рендерера, что
[sharp-svg-textpath-not-rendered.md](/.claude/docs/sharp-svg-textpath-not-rendered.md). Найдено
2026-09-17 в `domwellbes` при вёрстке SVG-плана этажа (Ф16, `PLAN_IFC_WAVES.md` I2) — нужны были
кириллические подписи, «поставить свой TTF» показалось достаточным и не сработало.

## Симптом

SVG с `<text font-family="Требуемый Шрифт">Текст</text>` рендерится через `sharp()`
**без единой ошибки** — но не тем шрифтом, что указан в `font-family`. Выглядит как проблема
контейнера («нет нужного шрифта в системе»), хотя дело не в наличии шрифта вовсе.

## Проверено эмпирически, не по документации librsvg

На версии `rsvg: 2.62.91` три варианта дали **побайтово идентичный** растр:

- `font-family="ИмяНезарегистрированногоСемейства"` — рендерится каким-то системным дефолтом;
- `<style>@font-face { font-family: 'X'; src: url(data:font/ttf;base64,...) }</style>` со
  встроенным через base64 TTF в теле того же SVG — тот же растр, что и без `@font-face` вовсе;
- SVG без `font-family` — тот же растр, что у первых двух.

Ни `font-family`, ни `@font-face` не влияют на результат: librsvg в этой сборке всегда падает на
свой дефолтный системный шрифт. Наличие/отсутствие нужного шрифта в контейнере
(`letar-node-runtime:24`) роли не играет — механизм подключения шрифта в SVG не работает
независимо от того, что установлено в системе, проверять `fc-list` смысла нет.

## Рабочая замена — контуры глифов вместо `<text>`

Единственный надёжный путь — не полагаться на то, что рендерер умеет резолвить шрифт по имени, а
превратить текст в геометрию заранее, той же библиотекой, что использует шрифт напрямую:

```typescript
import { createRequire } from 'node:module'
const fontkit = createRequire(import.meta.url)('fontkit') // без типов, untyped API

const font = fontkit.openSync('path/to/Font.ttf')
const scale = fontSizePx / font.unitsPerEm
const run = font.layout('Текст')

let penX = 0
for (let i = 0; i < run.glyphs.length; i++) {
  const glyph = run.glyphs[i]
  const position = run.positions[i]
  const d = glyph.path.toSVG() // путь в единицах шрифта, Y вверх, baseline = 0
  // SVG — Y вниз, поэтому scale(scale, -scale) на обёртке
  // <path d={d} transform={`translate(${x} ${y}) scale(${scale} ${-scale})`} fill={fill}/>
  penX += position.xAdvance
}
```

Тот же принцип, что делает `Font.register()` у `@react-pdf/renderer` (`src/lib/pdf/*.tsx`)
независимым от окружения: шрифт становится частью самого результата (векторные контуры в
выходном SVG), а не ссылкой на то, что должно быть установлено там, где SVG рендерится.
Побочный эффект: имя (например, комнаты) в подписи плана структурно не может быть XML-инъекцией —
это уже не текстовый узел, а геометрия путей.

Реализация — `src/lib/ifc/glyph-text.ts` в `domwellbes` (приватный submodule).

⚠️ `fontkit` — типичный кандидат оказаться транзитивной зависимостью (`@react-pdf/renderer` уже
тянет его), которая не резолвится напрямую под изолированной установкой bun
([nested-package-resolution-under-bun-isolated-installs.md](/.claude/docs/nested-package-resolution-under-bun-isolated-installs.md)).
Решение то же, что для любой такой зависимости — прямая запись в корневой `package.json`.

## API `fontkit`, которого нет в типах (untyped, нет `@types/fontkit`)

- `fontkit.openSync(path)` → `Font` с `.unitsPerEm`, `.layout(text)`.
- `.layout(text)` → `{ glyphs: Glyph[], positions: Position[] }`, `Position` — `xAdvance`,
  `xOffset`, `yOffset`.
- `Glyph.path` — **свойство**, не метод (`font.getPath(...)` на самом `Font` не существует).
  `Path.toSVG()` даёт `d`-строку, `Path.bbox` — габариты.

## Как проверять эту грабля быстро, без сборки приложения

```bash
node -e "
const sharp = require('sharp');
(async () => {
  const svgs = {
    unregistered: '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"60\"><text x=\"10\" y=\"40\" font-family=\"НесуществующийШрифт\" font-size=\"30\">Test</text></svg>',
    plain: '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"60\"><text x=\"10\" y=\"40\" font-size=\"30\">Test</text></svg>',
  };
  const a = await sharp(Buffer.from(svgs.unregistered)).raw().toBuffer();
  const b = await sharp(Buffer.from(svgs.plain)).raw().toBuffer();
  console.log('identical:', Buffer.compare(a, b) === 0);
})();
"
```

`identical: true` — грабля воспроизвелась на текущей версии sharp/librsvg (шрифт не влияет на
растр вовсе); `false` — `font-family` в этой сборке уже что-то значит, проверять `@font-face`
отдельно перед тем, как полагаться на него.
