# Свои `defineRecipe`/`defineSlotRecipe`: два способа тихо потерять переопределение

⚠️ Кастомный recipe с явным `fontSize`/`_hover` не гарантирует, что именно это значение победит в
итоговом CSS — порядок в JS-объекте не совпадает с порядком каскада.

## Баг 1 — `textStyle` в объекте варианта перебивает соседний `fontSize`

### Симптом

`variants.size.md` (или любой другой вариант) recipe одновременно задаёт `fontSize` (прямое
CSS-свойство) и унаследованный `textStyle` (компаунд-токен Panda). Явно прописанный `fontSize` не
применяется — в вычисленном стиле побеждает кегль из `textStyle`, хотя порядок ключей в JS-объекте
не имеет значения и `fontSize` формально стоит рядом или даже позже.

Конкретный пример: `phosphorButtonRecipe.variants.size.md` задавал `fontSize: '13px'`, но стоковый
`buttonRecipe.variants.size.md` (наследуемый через deep-merge конфигов) нёс `textStyle: 'sm'`,
резолвящийся в 16px через `fontSizes.sm`. Кегль кнопки на живом dev-сервере оказался 16px вместо
ожидаемых 13px.

### Причина

Panda раскрывает компаунд-токен `textStyle` в CSS **после** обычных свойств — по source order
сгенерированных классов, а не по порядку ключей в исходном JS-объекте. Deep-merge объектов ≠
порядок в итоговом CSS: `textStyle` — это отдельный слой правил, который применяется позже
`fontSize`, независимо от того, что написано раньше при чтении recipe-файла глазами.

### Фикс

Не смешивать `textStyle` и raw `fontSize`/`letterSpacing`/`textTransform`/`fontWeight` в одном
объекте варианта/базы. Нужен кастомный кегль — выносить его в отдельный
`defineTextStyles({...})` и подключать через `textStyle: 'myToken'` целиком, не полагаясь на то,
что соседний raw-`fontSize` победит рядом с унаследованным `textStyle`.

### Как диагностировать

`getComputedStyle` покажет неверное значение, но причина не видна в самом recipe-объекте — нужно
смотреть на СГЕНЕРИРОВАННЫЙ CSS. Наивная итерация `document.styleSheets`/`sheet.cssRules` может не
находить нужные правила, если они завёрнуты в `@layer recipes` — нужен рекурсивный обход
`rule.cssRules` (включая `CSSLayerBlockRule`), либо чтение `<style>`-тегов через `textContent`
напрямую — это оказалось надёжнее: сырой `document.styleSheets` иногда вообще не видел актуальные
`<style>`-теги дев-сервера, а `style.textContent.includes(className)` находил правило безотказно.

## Баг 2 — вариантный `_hover` перебивает базовый `_hover` того же свойства

### Симптом

`base._hover` задаёт, например, `bg: 'phos.bright'`. Конкретный `variants.variant.outline` не
переопределяет `_hover` явно — то есть наследует стоковый `variant.outline._hover` через deep-merge
конфигов (например `bg: 'colorPalette.subtle'`). При наведении кнопка красится в стоковый цвет из
варианта, а не в ожидаемый из `base`, хотя `base._hover` формально более специфичный/явный при
чтении объекта.

Конкретный пример: `phosphorButtonRecipe.base._hover` задавал инверсию `phos.bright`/`void`, но
`variant.outline` и `variant.solid` изначально не повторяли этот `_hover` явно. На деле кнопка при
наведении красилась в стоковый серо-зелёный `colorPalette.subtle`.

### Причина

В сгенерированном CSS класс варианта идёт **позже** по source order, чем класс базы — стоковое
значение из варианта побеждает над `base`, даже если в JS-объекте `base` выглядит как более общее и
«должно» переопределяться конкретным вариантом. Как и в баге 1: deep-merge объектов ≠ порядок CSS-
каскада, только здесь это касается не разных свойств (`textStyle` vs `fontSize`), а одного и того
же свойства между `base` и `variant`.

### Фикс

Каждый `variant`, которому нужно другое поведение на `_hover`/`_focusVisible`/`_active`/`_expanded`
и т.п., чем «просто наследовать от base», обязан явно повторить нужные объявления для этих свойств
в самом варианте — не полагаться на то, что `base` победит по специфичности.

## Общий вывод

В Chakra v3/Panda CSS порядок в исходном JS-объекте recipe (`base` → `variants` → компаунд-токены)
не предсказывает порядок в итоговом CSS. Любой раз, когда одно и то же CSS-свойство (или его
компаунд-эквивалент вроде `textStyle`) задано в двух местах recipe — в `base` и в `variant`, или как
raw-свойство и как компаунд-токен рядом — нужно явно проверять сгенерированный CSS, а не
доверять «моё значение написано вторым/специфичнее».

Найдено на `apps/studio` (submodule `letar-private-studio`), редизайн Э5 «Компоненты»,
`src/theme/phosphor/recipes.ts`, коммит `9744e5b`, 2026-08-19.

## Смежные документы

- [chakra-hover-condition-already-media-gated.md](/.claude/docs/chakra-hover-condition-already-media-gated.md) —
  другая ловушка того же условия `_hover`: своя обёртка `@media (hover: hover)` не нужна и ломает типы
- [chakra-multi-system-ssr-barrel-trap.md](/.claude/docs/chakra-multi-system-ssr-barrel-trap.md) —
  побочный эффект `createSystem()` в барреле темы роняет SSR
- [verification-pitfalls.md](/.claude/docs/verification-pitfalls.md) — как проверять
  `_hover`/`_active` в браузере и почему `getComputedStyle` при скрытой панели врёт
