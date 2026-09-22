# Локальные шрифты

JetBrains Mono лежит здесь файлом и подключается через `next/font/local` в
[`../layout.tsx`](../layout.tsx).

## Почему не `next/font/google`

`next/font/google` скачивает шрифт при **каждой** сборке — хрупкость загрузчика,
разбор случая с падением на domwellbes 2026-09-22 — `apps/domwellbes/src/app/fonts/README.md`.
Сборка больше не ходит в сеть за шрифтами.

## Что внутри

| Файл                                 | Гарнитура      | Ось `wght` | Размер |
| ------------------------------------ | -------------- | ---------- | ------ |
| `JetBrainsMono-cyrillic-latin.woff2` | JetBrains Mono | 400–700    | 34 КБ  |

Variable-шрифт, урезанный по оси до реально используемых начертаний — совпадает с прежним
`weight: ['400', '500', '600', '700']` у `next/font/google`.

Лицензия — SIL Open Font License 1.1, текст рядом: `OFL-JetBrainsMono.txt`.

## Покрытие символов

Подмножество — диапазоны Google Fonts `latin` + `cyrillic` (ровно те же, что стояли в
`subsets: ['latin', 'cyrillic']`). Проверка на посторонние символы в исходниках
(`scripts/fonts/scan-extra-glyphs.py apps/kami-key-the-landing/src`) нашла только `→` внутри
комментария в коде (не рендерится) — расширять подмножество не потребовалось.

Покрытие проверено разбором `cmap`, а не описанием шрифта — рецепт в
[font-cmap-coverage-verification](/.claude/docs/font-cmap-coverage-verification.md). Русский
алфавит (А–я, Ёё) покрыт полностью.

## Как пересобрать

```bash
python scripts/fonts/subset-google-font.py \
  --slug jetbrainsmono --family-camel JetBrainsMono \
  --weights 400 700 \
  --unicodes "0000-00FF,0131,0152-0153,02BB-02BC,02C6,02DA,02DC,0304,0308,0329,2000-206F,20AC,2122,2191,2193,2212,2215,FEFF,FFFD" "0301,0400-045F,0490-0491,04B0-04B1,2116" \
  --out apps/kami-key-the-landing/src/app/fonts/JetBrainsMono-cyrillic-latin.woff2
```

Общий скрипт — `scripts/fonts/subset-google-font.py` (качает variable TTF из зеркала
`google/fonts` на GitHub, режет unicode-подмножество, ограничивает ось `wght` диапазоном без
сплющивания в статику). Требует `pip install fonttools brotli`.
