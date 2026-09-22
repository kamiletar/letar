# Локальные шрифты

Inter (текст) и JetBrains Mono (моно) лежат здесь файлами и подключаются через
`next/font/local` в [`../[locale]/layout.tsx`](../[locale]/layout.tsx) — передаются в
`ThemeProvider` через проп `fonts={{ heading, body, mono }}`, который принимает тот же объект
(`.variable`/`.className`), что возвращают и `next/font/google`, и `next/font/local`.

## Почему не `next/font/google`

`next/font/google` скачивает шрифты при **каждой** сборке — хрупкость загрузчика, разбор случая с
падением на domwellbes 2026-09-22 — `apps/domwellbes/src/app/fonts/README.md`. Сборка больше не
ходит в сеть за шрифтами.

## Что внутри

| Файл                                 | Гарнитура      | Ось `wght` | Размер |
| ------------------------------------ | -------------- | ---------- | ------ |
| `Inter-cyrillic-latin.woff2`         | Inter          | 400–700    | 87 КБ  |
| `JetBrainsMono-cyrillic-latin.woff2` | JetBrains Mono | 400–700    | 34 КБ  |

Оба — variable-шрифты, ось `wght` ограничена диапазоном, реально используемым через семантические
токены Chakra (`normal`/`medium`/`semibold`/`bold` → 400/500/600/700). До перехода
`next/font/google` грузил их без ограничения по `weight` вовсе (только `subsets`).

Лицензии — SIL Open Font License 1.1, тексты рядом: `OFL-Inter.txt`, `OFL-JetBrainsMono.txt`.

## Покрытие символов

Подмножество — диапазоны Google Fonts `latin` + `cyrillic` (ровно те же, что стояли в
`subsets: ['cyrillic', 'latin']`). Расширений не потребовалось.

⚠️ В приложении есть компонент `MainMatrix`/`matrix-rain.tsx` — decorативный «Matrix rain» фон,
рисующий сотни символов из десятков письменностей (деванагари, грузинский, иврит, арабский, тайский,
CJK, эфиопский и др.). Эти символы **не связаны с подключаемыми шрифтами** — рендерятся через
`<canvas>` с `ctx.font = '${size}px monospace'` (generic CSS-ключевое слово, не наш `--font-mono`),
браузер сам резолвит их в системный monospace-шрифт с нужным покрытием. В подмножество не включены
и не должны быть — это была бы попытка засунуть в 34 КБ файл покрытие полусотни письменностей.

Emoji в шаблонах email (`lib/email/email-service.ts`) — вне скоупа: письма рендерятся отдельно от
сайта, со своим шрифтовым стеком почтового клиента.

Покрытие проверено разбором `cmap`
([font-cmap-coverage-verification](/.claude/docs/font-cmap-coverage-verification.md)). Русский
алфавит (А–я, Ёё) покрыт полностью в обоих файлах.

## Как пересобрать

```bash
python scripts/fonts/subset-google-font.py \
  --slug inter --family-camel Inter \
  --weights 400 700 \
  --unicodes "0000-00FF,0131,0152-0153,02BB-02BC,02C6,02DA,02DC,0304,0308,0329,2000-206F,20AC,2122,2191,2193,2212,2215,FEFF,FFFD" "0301,0400-045F,0490-0491,04B0-04B1,2116" \
  --out apps/kami/src/app/fonts/Inter-cyrillic-latin.woff2

python scripts/fonts/subset-google-font.py \
  --slug jetbrainsmono --family-camel JetBrainsMono \
  --weights 400 700 \
  --unicodes "0000-00FF,0131,0152-0153,02BB-02BC,02C6,02DA,02DC,0304,0308,0329,2000-206F,20AC,2122,2191,2193,2212,2215,FEFF,FFFD" "0301,0400-045F,0490-0491,04B0-04B1,2116" \
  --out apps/kami/src/app/fonts/JetBrainsMono-cyrillic-latin.woff2
```

Общий скрипт — `scripts/fonts/subset-google-font.py`. Требует `pip install fonttools brotli`.
