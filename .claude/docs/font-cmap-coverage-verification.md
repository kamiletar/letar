# Проверка покрытия символов шрифта — разбор cmap, не описание сайта

Сайты-агрегаторы пиксельных/моноширинных шрифтов (int10h.org, font-подборки на GitHub и т.п.)
описывают поддержку языка неточно: «Cyrillic support», «CJK ready» может означать и полное
покрытие алфавита, и десяток случайно попавших символов. Единственный надёжный способ узнать
реальное покрытие — скачать файл шрифта и разобрать его таблицу `cmap` напрямую, а не доверять
маркетинговому описанию.

## Найденный случай: Ark Pixel Font, 2026-08-19

Для японской локали `apps/studio` рассматривался `Ark Pixel Font` (OFL) в двух размерах растровой
сетки. Разбор `cmap` показал:

| Вариант             | Кодпоинтов всего | Кандзи из 20902 (CJK Unified Ideographs) |
| ------------------- | ---------------: | ---------------------------------------: |
| Ark Pixel 16px `ja` |             3196 |                                   **97** |
| Ark Pixel 12px `ja` |            24415 |                                **18237** |

16px-вариант — фактически латинско-канская гарнитура: кана есть, кандзи почти нет, набрать ей
японский текст нельзя. 12px-вариант покрывает кандзи полностью. Разница была видна и косвенно —
по весу файла релиза (16px ≈ 3 МБ, 12px ≈ 34 МБ), но точную цифру дал только разбор `cmap`.
Решение и таблица целиком — `apps/studio/REDESIGN_PLAN.md` §3 «Типографика и шрифт»,
`apps/studio/design/DESIGN_SYSTEM.md` §3.

## Когда это делать

Перед архитектурным решением о шрифте для нового языка/алфавита в любом приложении монорепо —
особенно для кириллицы, CJK, диакритики или псевдографики (CP437 box-drawing), где описание
шрифта на сайте-источнике не гарантирует реального покрытия.

## Как разобрать cmap

Формат шрифта (TTF/OTF, он же `sfnt`):

```
sfnt header (12 байт: version, numTables, searchRange, entrySelector, rangeShift)
  → table directory (по 16 байт на таблицу: tag, checksum, offset, length)
    → находим запись с tag == 'cmap'
      → cmap header (version, numTables)
        → cmap encoding records (platformID, encodingID, offset)
          → cmap subtable (по offset от начала таблицы cmap)
```

Практически важны два формата subtable:

- **Format 4** — символы из Basic Multilingual Plane (кириллица, кана, большинство CJK-CJK
  Unified Ideographs Extension A и часть основного блока). Хранит `segCountX2`, массивы
  `endCode`/`startCode`/`idDelta`/`idRangeOffset` — диапазоны кодпоинтов.
- **Format 12** — codepoint-диапазоны за пределами BMP (например emoji, редкие CJK-расширения).
  Хранит `nGroups` групп `(startCharCode, endCharCode, startGlyphID)`.

Для подсчёта «сколько кандзи реально покрыто» после парсинга `cmap` достаточно собрать множество
покрытых кодпоинтов и пересечь его с диапазоном CJK Unified Ideographs (`U+4E00`–`U+9FFF`, плюс
расширения при необходимости).

### Python

`fontTools` делает разбор `cmap` за готовую функцию, писать бинарный парсер руками не нужно:

```python
from fontTools.ttLib import TTFont

font = TTFont("ArkPixel-16px-ja.ttf")
cmap = font.getBestCmap()  # {codepoint: glyph_name}
covered = set(cmap.keys())

cjk = set(range(0x4E00, 0x9FFF + 1))  # CJK Unified Ideographs
print(f"{len(covered & cjk)} из {len(cjk)}")
```

`pip install fonttools`.

### Node

`fonteditor-core` или `opentype.js` дают тот же доступ без ручного бинарного парсинга:

```javascript
const opentype = require('opentype.js')

const font = opentype.loadSync('ArkPixel-16px-ja.ttf')
const covered = new Set()
for (let cp = 0; cp <= 0x10ffff; cp++) {
  if (font.charToGlyphIndex(String.fromCodePoint(cp)) !== 0) { covered.add(cp) }
}

const cjkCovered = [...covered].filter((cp) => cp >= 0x4e00 && cp <= 0x9fff)
console.log(`${cjkCovered.length} из ${0x9fff - 0x4e00 + 1}`)
```

`npm install opentype.js` (перебор всех кодпоинтов медленнее, чем прямой обход `cmap`, но не
требует ручного разбора subtable format 4/12).

## Итог

Если сайт-источник шрифта не даёт списка кодпоинтов явно — не доверяй словам «поддерживает X»,
скачивай файл и считай сам. Пяти минут на `fontTools.getBestCmap()` достаточно, чтобы не завязать
архитектурное решение на шрифт, непригодный для целевого языка.
