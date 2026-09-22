# Локальные шрифты

Inter лежит здесь файлом и подключается через `next/font/local` в [`../layout.tsx`](../layout.tsx).

## Почему не `next/font/google`

`next/font/google` скачивает шрифт при **каждой** сборке — хрупкость загрузчика, разбор случая с
падением на domwellbes 2026-09-22 — `apps/domwellbes/src/app/fonts/README.md`. Сборка больше не
ходит в сеть за шрифтами.

## Что внутри

| Файл                         | Гарнитура | Оси                                       | Размер |
| ---------------------------- | --------- | ----------------------------------------- | ------ |
| `Inter-cyrillic-latin.woff2` | Inter     | `wght` 400–700, `opsz` 14–32 (не тронута) | 88 КБ  |

Variable-шрифт: ограничена только ось `wght` (реально используемые начертания — `normal`/`medium`
/`semibold`/`bold` в тексте приложения), ось `opsz` оставлена как есть — раньше `next/font/google`
грузил Inter без ограничения `weight` вовсе (полный вариативный диапазон), здесь сужение
осознанное под фактическое использование.

Лицензия — SIL Open Font License 1.1, текст рядом: `OFL-Inter.txt`.

## Покрытие символов

Подмножество — диапазоны Google Fonts `latin` + `cyrillic` (ровно те же, что стояли в
`subsets: ['cyrillic', 'latin']`), плюс `←→≈≠≤≥▲▼` — в приложении реально отрисовывается `←` (кнопка
«← Все клиенты», `admin/clients/[id]/page.tsx`), остальные добавлены той же группой на будущее
(дешёво, несколько глифов). Эмодзи (`🔑✅➕⚠️`) не включены — они рисуются системным
emoji-шрифтом через fallback независимо от основного шрифта, Inter эти глиф-таблицы и раньше не
покрывал.

Покрытие проверено разбором `cmap`
([font-cmap-coverage-verification](/.claude/docs/font-cmap-coverage-verification.md)). Русский
алфавит (А–я, Ёё) покрыт полностью.

## Как пересобрать

```bash
python scripts/fonts/subset-google-font.py \
  --slug inter --family-camel Inter \
  --weights 400 700 \
  --unicodes "0000-00FF,0131,0152-0153,02BB-02BC,02C6,02DA,02DC,0304,0308,0329,2000-206F,20AC,2122,2191,2193,2212,2215,FEFF,FFFD" "0301,0400-045F,0490-0491,04B0-04B1,2116" "2190,2194,2248,2260,2264,2265,25B2,25BC" \
  --out apps/auth-hub/src/app/fonts/Inter-cyrillic-latin.woff2
```

Общий скрипт — `scripts/fonts/subset-google-font.py`. Требует `pip install fonttools brotli`.
