# `_hover` в Chakra v3 уже завёрнут в `@media (hover: hover)`

⚠️ Своя обёртка не нужна — и стоит 28 ошибок TS2322 в строках, к которым не прикасался.

## Симптом

Закрываешь известную проблему «на тач-устройствах `:hover` залипает после тапа и перекрывает
`_active`» — оборачиваешь hover-стили в свой медиазапрос внутри `defineLayerStyles` (то же самое
получится в `defineRecipe`, `defineSlotRecipe`, `defineTextStyles`):

```ts
'card.interactive': {
  value: {
    // ...
    '@media (hover: hover)': {
      _hover: { transform: 'translateY(-0.25rem)' },
    },
  },
},
```

`nx typecheck:tsgo <app>` падает с ~28 ошибками вида:

```
Type 'string' is not assignable to type 'Recursive<Token<LayerStyle>> | Token<LayerStyle>'
```

Ошибки указывают на **соседние layer-стили**, которых правка не касалась (`bg: 'bg.surface'`,
`borderRadius: 'card'` и т.п.), а не на добавленную строку. Сообщение на причину не намекает вообще:
выглядит как поломка токенов темы или как сломанный typegen.

## Причина ошибки типов

`defineLayerStyles` принимает вложенный реестр: ключ → либо `{ description, value }`, либо
**группа вложенных стилей**. Сырой ключ-медиазапрос (`'@media (...)': {...}`) внутри `value` не
входит в набор известных условий (`_hover`, `_active`, `md`, `_dark`, …), поэтому TS перестаёт
читать объект как набор стилевых пропов и начинает читать его как вложенный реестр токенов
`LayerStyle`. После этого каждое обычное строковое значение рядом (`'bg.surface'`) перестаёт
подходить под ожидаемый `Recursive<Token<LayerStyle>>` — отсюда пачка ошибок в нетронутых строках.

Ключевое: **ошибки типов — следствие, а не суть.** Даже если бы типы прошли, обёртка была бы лишней.

## Суть: условие `hover` уже содержит медиазапрос

Условие `hover` у Chakra v3 определено как массив из двух частей:

```js
// node_modules/@chakra-ui/react/dist/cjs/preset-base.cjs → defaultConditions
hover: [
  '@media (hover: hover)',
  '&:is(:hover, [data-hover]):not(:disabled, [data-disabled])',
],
```

То же видно в сгенерированных типах — первая строка интерфейса `Conditions`
(`node_modules/@chakra-ui/react/dist/types/styled-system/generated/conditions.gen.d.ts`):

```ts
/** `@media (hover: hover),&:is(:hover, [data-hover]):not(:disabled, [data-disabled])` */
_hover: string
```

То есть `_hover` **и так** не применяется на устройствах без настоящего hover. Своя обёртка даёт в
CSS буквально `@media (hover: hover){@media (hover: hover){...}}` — работает так же, но с лишней
вложенностью и ценой в виде разбора чужих ошибок типов.

Проверено на Chakra 3.36.1 (2026-08-19, сессия по `domwellbes` — правка press-эффекта у
интерактивных карточек, коммит `08b393a` в submodule).

## Как правильно

Просто `_hover` — без обёртки:

```ts
_hover: {
  borderColor: 'border.emphasized',
  boxShadow: 'cardHover',
  transform: 'translateY(-0.25rem)',
},
_active: {
  transform: 'scale(0.97)',
  boxShadow: 'card',
},
```

Если нужно **дополнительное** ограничение (например «только тонкий указатель»), медиазапрос всё
равно не пишется сырым ключом — Chakra даёт для этого свои условия и механизм
`defineConditions()` в пресете приложения. Сырой `@media` в объекте стилей ломает вывод типов
описанным выше способом.

## Смежное — почему hover вообще подозревали

Проблема «тап оставляет hover-состояние и оно перекрывает `_active`» реальна, но на Chakra v3
закрыта самим фреймворком. Что действительно нужно добавить рядом для тач-устройств:

- `touchAction: 'manipulation'` — убирает 300ms задержку клика;
- заметный `_active` (масштаб, а не полтора пикселя сдвига) — иначе нажатие формально есть, а
  глазу его нет.

## Смежные документы

- [chakra-strict-tokens-global-typegen.md](/.claude/docs/chakra-strict-tokens-global-typegen.md) —
  другой случай, где ошибки типов вылезают не там, где правил
- [verification-pitfalls.md](/.claude/docs/verification-pitfalls.md) — как проверять
  `_hover`/`_active` в браузере и почему `getComputedStyle` при скрытой панели врёт
