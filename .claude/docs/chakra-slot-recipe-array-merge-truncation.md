# Chakra `createSystem()` мержит `slots`-массив по индексу — короткий partial-override молча вычёркивает слоты anatomy

**Симптом:** partial-override slot-рецепта (`defineSlotRecipe` в `theme/recipes/*.ts`,
подключённый через `theme.slotRecipes` в `defineConfig`/`createSystem(defaultConfig, ...)`)
переопределяет только пару свойств у одного-двух слотов — а на практике теряют стиль (высоту,
паддинги, вообще любой CSS) слоты, которые в этом рецепте даже не упоминались.

Найдено 2026-09-10 (domwellbes): `Field.Combobox` терял высоту и внутренние отступы у инпута
поиска — `height: 21.6px, padding: 0` вместо ожидаемых `height: 40px, padding: 0 12px` (подтверждено
JS-инспекцией `getComputedStyle` на живой странице, не догадкой по скриншоту).

## Механизм

`createSystem(defaultConfig, domwellbesConfig)` внутри вызывает `mergeConfigs()`
(`@chakra-ui/react` `dist/esm/styled-system/merge-config.js`), которая делает
`mergeWith({}, ...configs.map(clone))`. Реализация `merge()`
(`dist/esm/utils/merge.js`) для двух **массивов** (не объектов) делает вот что:

```js
} else if (Array.isArray(source[key]) && Array.isArray(target[key])) {
  let i = 0;
  for (; i < source[key].length; i++) {
    target[key][i] = source[key][i];   // ПО ИНДЕКСУ, не по значению
  }
}
```

Она проходит только `source.length` элементов и **перезаписывает по индексу**. `slots` у
`defineSlotRecipe` — это массив имён слотов anatomy компонента. Дефолтный рецепт Chakra
(`comboboxSlotRecipe` и т.п. из `@chakra-ui/react/dist/esm/theme/recipes/*.js`) объявляет
**полный** список слотов в определённом порядке (для combobox — `root, clearTrigger, content,
control, input, item, itemGroup, itemGroupLabel, itemIndicator, itemText, label, list,
positioner, trigger, indicatorGroup, empty`, порядок из `@zag-js/combobox`
`combobox.anatomy.js` + `.extendWith(...)`).

Если приложение объявляет свой `comboboxSlotRecipe` с укороченным `slots: ['input', 'trigger']`
(намерение — «переопределяю только эти два слота»), merge заменит **элементы с индексами 0 и 1**
дефолтного массива (`root`, `clearTrigger`) на `'input'`/`'trigger'` — не добавит их, а
**вычеркнет `root` и `clearTrigger` из итогового списка слотов** (с дублированием `input`/
`trigger`, которые остаются на своих исходных индексах дальше по массиву).

Дальше `getSlotRecipes()` (`dist/esm/styled-system/sva.js`) строит объект стилей **только** по
слотам из этого корёженного массива — `root` в него не попадает, значит для него никогда не
вызывается `cva()`, и рендер-функция слота `root` просто не существует. Если у `root` были CSS
custom properties (переменные типа `--combobox-input-height`, которые кладутся именно на `root`
в size-вариантах combobox), они никогда не попадают в DOM — а `var(--combobox-input-height)` в
CSS другого слота (`input`) резолвится в ничто, и браузер дропает всю декларацию с этим `var()`.

## Почему `select`/`nativeSelect` в том же файле не выглядели сломанными

Та же ошибка (`slots: ['trigger']` у select, `slots: ['field']` у nativeSelect) там тоже
корёжит индекс 0 (`label`/`root` соответственно) — но эти слоты почти не несут собственного CSS,
поэтому потеря незаметна на глаз. Только у combobox потерянный слот (`root`) оказался
единственным носителем CSS-переменных высоты/паддинга — отсюда видимый баг только там.

## Фикс

`slots` в partial-override рецепте должен перечислять **весь** anatomy в правильном порядке (не
только переопределяемые слоты) — тогда merge по индексу переписывает те же значения на те же
позиции (no-op для остальных). Источник правильного порядка — сам компонент из
`@ark-ui/react`/`@zag-js/*` (`*.anatomy.js`/`.mjs` внутри `node_modules`) плюс
`.extendWith(...)`-довески из `@chakra-ui/react/dist/esm/anatomy.js` (если есть — не все
компоненты их имеют). Пример — `apps/domwellbes/src/theme/recipes/controls.ts`
(`selectAnatomyOrder`/`nativeSelectAnatomyOrder`/`comboboxAnatomyOrder`).

`@chakra-ui/react` не экспортирует эти anatomy-объекты из публичного `index.js` — их нельзя
импортировать напрямую и передать как `slots: xxxAnatomy.keys()`, нужно хардкодить массив (с
комментарием-источником, на случай апгрейда версии Chakra, меняющего anatomy).

## Как проверить, что рецепт не задет этим багом

Один короткий массив `slots` в partial-override — уже сигнал тревоги. Живая проверка —
`getComputedStyle()` на нужном слоте в браузере и сравнение с соседним, заведомо рабочим
контролом того же размера (см. пример выше: combobox-input vs number-input в одной форме).
