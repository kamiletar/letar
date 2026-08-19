# ⚠️ `Pressable` из `@letar/ui` обрезает focus ring обёрнутой кнопки

`Pressable` рендерит `<Box position="relative" overflow="hidden" data-pressable>` — `overflow:
hidden` нужен, чтобы круг ripple не вылезал за границы поверхности. Побочный эффект: этот же
`overflow` отсекает **outline потомков**, а focus ring Chakra v3 у кнопки рисуется целиком
**снаружи** её border-box:

```
outline-width: 2px
outline-offset: 2px   ← полоса 2–4px за пределами кнопки
```

Обёртка инлайн-флексом ужимается ровно по кнопке, то есть её зона отсечения **совпадает** с
border-box кнопки. Значит ring попадает в отсечённую область целиком и не рисуется вовсе.

## Почему это не заметно при обычной проверке

- Внешне ничего не ломается: вёрстка не едет, ripple работает, клик работает. Пропадает только
  индикатор клавиатурного фокуса — то, что видно, лишь если реально ходить по странице Tab'ом.
- В консоли пусто, гидратация чистая, `nx lint`/`typecheck` зелёные.
- `getComputedStyle(button).outlineWidth` при фокусе честно вернёт `2px`: свойство **применено**,
  оно просто не доходит до экрана. Проверка вычисленного стиля кнопки даёт ложноуспокаивающий
  результат — она не про отрисовку.

## Как поймать без скриншота

Достаточно геометрии: если прямоугольник обёртки совпадает с прямоугольником кнопки, а у кнопки
`outline-offset` ≥ 0 — ring гарантированно снаружи зоны отсечения.

```js
const w = btn.closest('[data-pressable]')
const same = JSON.stringify(w.getBoundingClientRect()) === JSON.stringify(btn.getBoundingClientRect())
const clipped = same && getComputedStyle(w).overflow === 'hidden'
```

## Фикс: продублировать ring на самой обёртке

Собственный outline элемента **не** режется его же `overflow` — режутся только потомки. Поэтому
ring переносится на обёртку теми же значениями, что у кнопки, и визуально остаётся неотличимым:

```tsx
<Pressable
  display="inline-flex"
  borderRadius="full"
  css={{
    '&:has(:focus-visible)': {
      outline: '2px solid',
      outlineColor: 'focus.ring',
      outlineOffset: '2px',
    },
  }}
>
  <Button asChild colorPalette="brand" borderRadius="full">
    <NextLink href="/somewhere">Действие</NextLink>
  </Button>
</Pressable>
```

`:has(:focus-visible)`, а **не** `_focusWithin`: `focus-within` срабатывает и на клик мышью, из-за
чего ring вылезал бы при каждом нажатии. `borderRadius` обёртки обязан совпадать с кнопочным,
иначе ring обведёт другую форму.

Не «чинить» это снятием `overflow: hidden` у обёртки — тогда круг ripple выйдет за края кнопки.

## Смежные ограничения `Pressable`, которые определяют, где его вообще уместно ставить

- **Ripple только для мыши.** `useRipple` выходит на первой строке, если `pointerType !== 'mouse'`.
  На элементе, видимом только на мобильном (`display={{ base: 'flex', lg: 'none' }}`), обёртка не
  даст ripple никогда — останется один лишь `[data-pressable]`-эффект из `pressableConfig`.
- **Цвет ripple захардкожен светлым полупрозрачным** (`RippleEl` в `libs/ui/src/lib/pressable.tsx`).
  На светлой поверхности (`variant="outline"` и любой вариант со светлой заливкой) он невидим —
  обёртка добавит вес в DOM без единого видимого эффекта.
- **`pressableConfig` даёт вторую глубину нажатия.** В нём `_active: { transform: 'scale(0.93)' }`
  на `[data-pressable]`. Если у кнопки/карточки уже есть свой `_active: scale(...)`, внутри обёртки
  трансформы **перемножаются** (0,93 × 0,97 ≈ 0,90) и идут по разным кривым: у обёртки spring
  `cubic-bezier(0.34, 1.56, 0.64, 1)`, у кнопки обычно короткий `ease`. Приложению со своей шкалой
  глубины разливать `pressableConfig.globalCss` целиком не нужно — берётся только
  `touchAction: manipulation` и кейфрейм `ripple-expand`, а глубина остаётся за рецептом.

## `pressableConfig` в теме ≠ используемый Pressable

Блок

```ts
theme: { keyframes: { ...pressableConfig.keyframes } },
globalCss: { ...pressableConfig.globalCss },
```

входит в шаблон генератора — `libs/generators/src/generators/new-app/files/src/theme/index.ts.template`.
Поэтому он есть в теме почти каждого сгенерированного приложения **независимо от того, есть ли
там хоть один потребитель**. На 2026-08-19 таких приложений с подключённым конфигом и без единого
`<Pressable>`/`<PressableButton>`/`data-pressable` в коде — большинство.

Прежде чем считать наличие конфига признаком «в приложении используется Pressable», проверь:

```bash
grep -rn "data-pressable\|Pressable" apps/<app>/src
```

Совпадения только внутри `src/theme/` означают, что конфиг едет в бандл вхолостую.
