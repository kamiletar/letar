# Chakra UI v3 — обычный семантический цвет на инвертированной поверхности

⚠️ Соседний, но другой класс бага, чем
[chakra-semantic-token-contract](/.claude/docs/chakra-semantic-token-contract.md): там речь про
**отсутствие** переопределения статусных ключей (`fg.error` и т.п.) в `semanticTokens`
приложения. Здесь ключ переопределён и работает правильно — проблема в том, что он применён на
поверхности, которая сама инвертирована относительно текущей темы страницы.

## Механизм

`bg.inverted`/`fg.inverted`/`border.inverted` — это не «третий цвет», а **буквальный обмен
`_light` ↔ `_dark`** значений соответствующего DEFAULT-токена. Смотреть в
`node_modules/@chakra-ui/react/dist/esm/theme/semantic-tokens/colors.js`:

```js
bg: {
  DEFAULT: { value: { _light: '{colors.white}', _dark: '{colors.black}' } },
  inverted: { value: { _light: '{colors.black}', _dark: '{colors.white}' } }, // ровно наоборот
},
fg: {
  DEFAULT: { value: { _light: '{colors.black}', _dark: '{colors.gray.50}' } },
  inverted: { value: { _light: '{colors.gray.50}', _dark: '{colors.black}' } },
}
```

То есть в тёмной теме страницы `bg.inverted` резолвится в **белый**, в светлой — в **чёрный**.
Стоковый рецепт `Tooltip` (`recipes/tooltip.js`) рисует `Tooltip.Content` именно на этой
поверхности:

```js
content: {
  "--tooltip-bg": "colors.bg.inverted",
  bg: "var(--tooltip-bg)",
  color: "fg.inverted",
}
```

**Компонент внутри инвертированной поверхности не «наследует» инверсию автоматически.** Любой
обычный семантический цвет (`color="green.fg"`, `color="fg.error"`, `color="colorPalette.fg"` и
т.п.), поставленный внутрь такого слота, продолжает резолвиться по **текущей теме страницы**, а
не по теме слота. В тёмной теме `green.fg`/аналоги рассчитаны на тёмный фон (светло-зелёный) —
но фон тултипа в этот момент белый (`bg.inverted` в `_dark` = белый). Получается светлый текст на
белом: контраст резко проваливается, хотя в контексте обычного `<Box bg="bg.panel">` тот же самый
токен был бы читаем прекрасно.

## Как найти остальные такие места

Грепом по `bg.inverted`/`fg.inverted` в скомпилированных рецептах Chakra — список компонентов,
которые сами рисуются на инвертированной поверхности:

```bash
grep -rl "bg.inverted\|fg.inverted" node_modules/@chakra-ui/react/dist/esm/theme/recipes/
```

На 2026-09-09 единственный стоковый рецепт с этим свойством — `Tooltip`
(`recipes/tooltip.js`). Если апстрим Chakra добавит инвертированный `Popover`/`Menu`/toast — этот
греп их сразу покажет; отдельно проверять свои `defineSlotRecipe`/`defineRecipe`, если они сами
используют `bg.inverted`/`fg.inverted` в базовых стилях (в этом монорепо на 2026-09-09 не
встречалось).

Внутри приложения — искать использование `color=`/`bg=` обычных семантических токенов
**внутри** `Tooltip.Content` (и любых кастомных обёрток вокруг него), а не по всему дереву — вне
инвертированной поверхности эти же токены абсолютно корректны.

## Фикс: инвертировать вручную той же логикой, что и сама поверхность

Не подбирать «один цвет, который выглядит нормально в обеих темах», а явно поменять местами
`_light`/`_dark` — раз поверхность уже перевёрнута, любой цвет поверх неё должен быть перевёрнут
тоже, чтобы отношение «текст к фону» осталось тем же, что и на обычной поверхности:

```tsx
// ❌ обычный семантический токен — рассчитан на ТЕКУЩУЮ тему страницы,
// а не на инвертированную поверхность bg.inverted самого Tooltip.Content
<Text color="green.fg">{impact}</Text>

// ✅ вручную инвертированный подбор — та же идея, что у bg.inverted/fg.inverted:
// в тёмной теме страницы (где bg.inverted = белый) берём ТЁМНЫЙ оттенок,
// в светлой (bg.inverted = чёрный) — светлый
<Text color={{ _light: 'green.300', _dark: 'green.700' }}>{impact}</Text>
```

Разбор конкретного места — [field-tooltip.tsx](/libs/forms/src/lib/declarative/form-fields/base/field-tooltip.tsx),
коммит «пробросить tooltip в Field.String, поправить контраст FieldTooltip в тёмной теме»
(`@letar/forms`, 2026-09-09). `title`/`description` в том же компоненте используют дефолтный
`fg.inverted` (не заданный явно) и корректны без правки — баг был именно в ручном `green.fg`
поверх этой поверхности, не во всём компоненте.

## Как проверить без визуального осмотра

Тот же подход, что в [chakra-semantic-token-contract §4](/.claude/docs/chakra-semantic-token-contract.md#4-как-проверить-без-визуального-осмотра) —
`system.tokens.getByName()` для обоих `colorMode`, но сравнивать нужно резолв **связки**
«цвет поверх фона слота», а не токен изолированно:

```ts
import { system } from '@/theme'

const bg = system.tokens.getByName('colors.bg.inverted', { conditions: { colorMode: 'dark' } })
const fg = system.tokens.getByName('colors.green.700', { conditions: { colorMode: 'dark' } })
// прогнать пару через wcag-contrast/polished, порог 4.5:1 для обычного текста
```

Просто проверить, что `green.700` существует как токен, недостаточно — нужно убедиться, что
именно эта пара (цвет × реальный фон слота в данном `colorMode`) проходит контраст, потому что
фон слота инвертирован относительно `colorMode`, а не совпадает с ним.
