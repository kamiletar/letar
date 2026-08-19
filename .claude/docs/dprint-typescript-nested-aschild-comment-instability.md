# dprint-plugin-typescript: `Formatting not stable` при комментарии перед JSX внутри тройного `asChild`

## Симптом

`nx run-many -t format --projects=<app>` (и голый `bunx dprint fmt <файл>`) падает на конкретном
`.tsx`-файле с ошибкой:

```
Error formatting .../post-screen.tsx. Message: Formatting not stable. Bailed after 5 tries.
```

Файл при этом синтаксически корректен, собирается и работает — сбоит только сам форматтер:
`dprint-plugin-typescript` не может сойтись к неподвижной точке за 5 итераций.

## Точное условие срабатывания

Нужны одновременно все условия:

1. Компонент Chakra UI с проп `asChild`, вложенный **три уровня подряд** (`Box asChild` >
   `Box asChild` > ещё один `Box asChild`).
2. На третьем уровне у `Box asChild` есть динамический проп (например `color={fn(...)}`).
3. Третий уровень возвращается из `.map()`-колбэка, который сам вложен внутри другого
   `.map()`-колбэка.
4. Непосредственно перед JSX-элементом третьего уровня стоит `// комментарий` — форма не важна
   (line-комментарий, `eslint-disable-next-line`, block-комментарий — все триггерят одинаково).

Без комментария перед этим элементом — стабильно, даже при тех же трёх уровнях вложенности.
С комментарием, но при двух уровнях вложенности (не трёх) — тоже стабильно. Убрать любое из
четырёх условий убирает и баг.

Проверено отдельно и **не подтвердилось** как причина: длина строки, юникод-экранирование
кириллицы (`В` vs literal), вложенные тернарники в JSX-атрибутах.

## Минимальный воспроизводящий пример

<!-- dprint-ignore -->

```tsx
'use client'
import { Box } from '@chakra-ui/react'
import { useState } from 'react'

type Tone = 'dim' | 'normal' | 'bright'
interface Segment { text: string; tone?: Tone }
type PostLine = Segment[]

function toneColor(tone?: Tone): string | undefined {
  if (tone === 'bright') return 'fg.bright'
  if (tone === 'normal') return 'fg'
  return undefined
}

export function PostScreen() {
  const [history] = useState<PostLine[]>([])
  const [pendingText] = useState<string | null>(null)

  return (
    <Box role="status" position="fixed" inset={0}>
      <Box asChild fontSize={{ base: '10px', md: '13px' }}>
        <pre>
          {history.map((ln, i) => (
            <Box key={i} asChild>
              <span>
                {ln.map((seg, j) => (
                  // eslint-disable-next-line react/no-array-index-key -- любой комментарий здесь триггерит баг
                  <Box key={j} asChild color={toneColor(seg.tone)}>
                    <span>{seg.text}</span>
                  </Box>
                ))}
              </span>
            </Box>
          ))}
          {pendingText}
        </pre>
      </Box>
    </Box>
  )
}
```

`bunx dprint fmt <этот-файл>` из каталога с `dprint.json` воспроизводит «Formatting not stable.
Bailed after 5 tries.». Удаление строки с комментарием (или сведение вложенности `Box asChild` к
двум уровням) форматируется стабильно.

## Обход

Убрать один уровень вложенности `asChild`. В реальном коде (`apps/studio` —
`_components/entry/post-screen.tsx`) внешний `<Box asChild><pre>...</pre></Box>` заменён на
`<Box whiteSpace="pre-wrap">...</Box>` без вложенного `asChild`+`<pre>` — визуально идентично,
`white-space: pre-wrap` не требует настоящего тега `<pre>`.

Комментарий перед JSX-элементом при этом можно оставлять — он безопасен, когда вложенность
`asChild` не достигает третьего уровня.

## Статус

Баг воспроизведён в `dprint-plugin-typescript` 0.95.3, апстрим не проверялся. Если встретишь
аналогичную ошибку `Formatting not stable` на другом файле — в первую очередь проверь число
вложенных `asChild` и наличие комментария перед JSX внутри них, прежде чем разбирать остальной
код.
