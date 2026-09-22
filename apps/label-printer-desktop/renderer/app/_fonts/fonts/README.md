# Локальные шрифты

Source Sans 3 и Cousine лежат здесь файлами и подключаются через `next/font/local` в
[`../index.ts`](../index.ts).

## Почему не `next/font/google`

`next/font/google` скачивает шрифты при **каждой** сборке — хрупкость загрузчика, разбор случая с
падением на domwellbes 2026-09-22 — `apps/domwellbes/src/app/fonts/README.md`. У этого приложения
сборка renderer (`next build`) — обязательный шаг в `build`/`build:win`/`build:linux` перед
`electron-builder`, поэтому та же хрупкость применима к любому релизу, независимо от того, что
он происходит не на сервере деплоя, а локально/в CI разработчика.

## Что внутри

| Файл                                   | Гарнитура     | Ось `wght`         | Размер |
| -------------------------------------- | ------------- | ------------------ | ------ |
| `SourceSans3-cyrillic-latin.woff2`     | Source Sans 3 | 400–700 (variable) | 72 КБ  |
| `Cousine-Regular-cyrillic-latin.woff2` | Cousine       | 400 (static)       | 20 КБ  |
| `Cousine-Bold-cyrillic-latin.woff2`    | Cousine       | 700 (static)       | 20 КБ  |

Source Sans 3 — variable-шрифт, ось `wght` ограничена диапазоном `400 700`, покрывающим и
промежуточные значения (прежний `weight: ['400', '600', '700']` у `next/font/google` был
дискретной вырезкой из того же диапазона). **Cousine в google/fonts не variable** — только
статические начертания (`Cousine-Regular.ttf`, `Cousine-Bold.ttf`), поэтому вместо одного файла
с осью здесь два файла, подключённые как массив `src` с собственным `weight` у каждого — ровно то
же, что раньше давал `weight: ['400', '700']`.

Лицензия — SIL Open Font License 1.1, тексты рядом: `OFL-SourceSans3.txt`, `OFL-Cousine.txt`
(один файл на оба начертания Cousine — лицензия идентична).

## Покрытие символов

Подмножество — диапазоны Google Fonts `latin` + `cyrillic` (ровно те же, что стояли в
`subsets: ['latin', 'cyrillic']`), без дополнительных групп символов.

Единственный найденный в исходниках символ вне latin+cyrillic — `→` (U+2192) в
`app/api/model/[...path]/route.ts:66`, внутри `console.error(...)` (серверный лог, не рендерится
в UI) — исключён из субсета по тому же паттерну, что комментарии/тестовые данные в
`aboi`/`driving-school`.

Покрытие проверено разбором `cmap`
([font-cmap-coverage-verification](/.claude/docs/font-cmap-coverage-verification.md)). Русский
алфавит (А–я, Ёё) покрыт полностью в обеих гарнитурах.

## Как пересобрать

```bash
# Source Sans 3 (variable, 400-700)
python scripts/fonts/subset-google-font.py \
  --slug sourcesans3 --family-camel SourceSans3 \
  --weights 400 700 \
  --unicodes "0000-00FF,0131,0152-0153,02BB-02BC,02C6,02DA,02DC,0304,0308,0329,2000-206F,20AC,2122,2191,2193,2212,2215,FEFF,FFFD" "0301,0400-045F,0490-0491,04B0-04B1,2116" \
  --out apps/label-printer-desktop/renderer/app/_fonts/fonts/SourceSans3-cyrillic-latin.woff2

# Cousine (static, нет variable-файла в google/fonts)
python scripts/fonts/subset-google-font.py \
  --slug cousine --static-file Cousine-Regular.ttf --family-camel Cousine-Regular \
  --unicodes "0000-00FF,0131,0152-0153,02BB-02BC,02C6,02DA,02DC,0304,0308,0329,2000-206F,20AC,2122,2191,2193,2212,2215,FEFF,FFFD" "0301,0400-045F,0490-0491,04B0-04B1,2116" \
  --out apps/label-printer-desktop/renderer/app/_fonts/fonts/Cousine-Regular-cyrillic-latin.woff2

python scripts/fonts/subset-google-font.py \
  --slug cousine --static-file Cousine-Bold.ttf --family-camel Cousine-Bold \
  --unicodes "0000-00FF,0131,0152-0153,02BB-02BC,02C6,02DA,02DC,0304,0308,0329,2000-206F,20AC,2122,2191,2193,2212,2215,FEFF,FFFD" "0301,0400-045F,0490-0491,04B0-04B1,2116" \
  --out apps/label-printer-desktop/renderer/app/_fonts/fonts/Cousine-Bold-cyrillic-latin.woff2
```

Общий скрипт — `scripts/fonts/subset-google-font.py`. Требует `pip install fonttools brotli`.
После пересборки Cousine переименуй один из `OFL-Cousine-*.txt` в `OFL-Cousine.txt` (лицензия у
Regular/Bold идентична, второй файл — удалить).
