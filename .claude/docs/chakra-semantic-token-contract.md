# Chakra UI v3 — контракт семантических токенов stock-рецептов

⚠️ Стоковые рецепты Chakra (`Button`, `Input`, `Card`, `Alert`, `Field`, `Checkbox` и др.) читают
конкретные семантические ключи — `bg.panel`, `fg.error`/`fg.warning`/`fg.success`/`fg.info`,
`border.error`/`border.warning`/`border.success`/`border.info`, `l1`/`l2`/`l3` (радиусы),
`shadows.xs..2xl` и 8-ключевой контракт `colorPalette` (`solid, contrast, fg, muted, subtle,
emphasized, focusRing, border`). Если приложение не переопределяет эти ключи в своих
`semanticTokens`, Chakra тихо подставляет собственные дефолты через палитры
`red`/`orange`/`green`/`blue`/`gray` — цвета мимо дизайн-системы приложения и, как правило,
провал WCAG AA по контрасту.

Референс полной реализации — `apps/domwellbes/src/theme/semanticTokens/colors.ts` +
`apps/domwellbes/src/theme/semanticTokens/radii.ts` + `apps/domwellbes/src/theme/recipes/controls.ts`
(коммит «контракт статусных токенов, контраст границ полей и радиусы контролов», 2026-08-19).
domwellbes — единственное приложение монорепо, где контракт замкнут полностью.

## 1. Доказательство: какие ключи реально читают стоковые рецепты

Смотреть в `node_modules/@chakra-ui/react/dist/esm/theme/semantic-tokens/` и
`node_modules/@chakra-ui/react/dist/esm/theme/recipes/*.js` — это не соглашение по конвенции, а
буквальные ссылки в скомпилированных рецептах.

**Сам Chakra закрывает `bg`/`fg`/`border` статусными ключами через свои палитры** —
`semantic-tokens/colors.js`:

```js
bg: { ..., error: {_light:'{colors.red.50}',_dark:'{colors.red.950}'}, warning: {...orange...},
      success: {...green...}, info: {...blue...} },
fg: { ..., error: {_light:'{colors.red.500}',_dark:'{colors.red.400}'}, ... },
```

Это и есть контракт, который приложение обязано достроить под свои палитры — у Chakra нет
понятия «палитра этого приложения», только `red`/`orange`/`green`/`blue`/`gray`.

`semantic-tokens/radii.js`:

```js
const semanticRadii = defineSemanticTokens.radii({
  l1: { value: '{radii.xs}' },
  l2: { value: '{radii.sm}' },
  l3: { value: '{radii.md}' },
})
```

`recipes/input.js` — рецепт `Input` ссылается на `border.error` для invalid-состояния, на `l2`
для радиуса и на `colorPalette.focusRing` для фокус-кольца:

```js
borderRadius: "l2",
"--focus-color": "colors.colorPalette.focusRing",
"--error-color": "colors.border.error",
```

`recipes/card.js` — `bg.panel`/`bg.muted`, радиус `l3`:

```js
borderRadius: "l3",
bg: "bg.panel", ... bg: "bg.muted"
```

`recipes/button.js` и `recipes/alert.js` — полный `colorPalette`-контракт:

```js
bg: "colorPalette.solid", color: "colorPalette.contrast",
bg: "colorPalette.subtle", color: "colorPalette.fg",
"--outline-color": "colors.colorPalette.border",
```

Итого: `colorPalette.solid/contrast/fg/muted/subtle/emphasized/focusRing/border`,
`border.error`/`l1`/`l2`/`l3`/`bg.panel`/`bg.muted` — это рабочий контракт, на который завязаны
десятки стоковых компонентов. Если приложение не объявляет эти ключи в своей теме — Chakra не
падает и не предупреждает, а тихо подставляет свои дефолты.

## 2. Что ломается при пропуске

Найдено на аудите domwellbes (сессия 2026-08-19, до фикса):

| Что                                                                                      | Фактический контраст         | Норма WCAG AA         | После фикса     |
| ---------------------------------------------------------------------------------------- | ---------------------------- | --------------------- | --------------- |
| текст ошибки формы (19 мест, `fg.error` не переопределён → Chakra-дефолт `red.500`)      | 3,76:1 / 3,45:1 (light/dark) | 4,5:1 (обычный текст) | 7,50:1 / 6,88:1 |
| рамка поля ввода (33 контрола, общий декоративный `border` вместо роли `border.control`) | 1,43:1 / 1,31:1              | 3:1 (UI-границы)      | 4,61:1 / 4,22:1 |

Причина, дословно из аудита: «Chakra определяет `bg`/`fg`/`border` × `error`/`warning`/`success`/
`info` сама, но через палитры `red`/`orange`/`green`/`blue`. У приложения таких палитр нет — есть
свои `error`/`warning`/`success`/`info`, и они с самого начала были недостижимы через
семантический слой. Компоненты молча получали стоковые холодные цвета поверх тёплой минеральной
палитры.»

Класс бага не ограничен цветом текста:

- **Радиусы.** Без семантических `l1`/`l2`/`l3` компоненты используют дефолт Chakra
  (2px/4px/6px) вместо языка формы приложения — рассинхрон визуального стиля между стоковыми и
  кастомными компонентами, не видимый в коде (числа выглядят «нормальными»).
- **Граница контрола vs декоративная граница.** Один и тот же `border` токен используется и для
  тонкой декоративной рамки карточки, и для рамки инпута — но у них разные требования
  контраста (декоративная граница не обязана проходить 3:1, граница управляющего элемента —
  обязана, WCAG 1.4.11). Без отдельной роли `border.control` любое повышение контраста
  декоративной границы «на глаз» ломает эстетику карточек, а не повышение — оставляет инпуты
  неразличимыми.
- **`_invalid` в собственных рецептах.** Chakra зашивает `red.500` литералом в `_invalid`-состоянии
  части рецептов (checkmark/radiomark) в обход семантики — единственное место, где переопределение
  `border.error` в `semanticTokens` не достаточно, нужно явно перекрыть в своём `recipes/*.ts`
  (см. `apps/domwellbes/src/theme/recipes/controls.ts`).

## 3. Как подбирать оттенок по контрасту — не на глаз

WCAG 2.1 требует:

- **4.5:1** — обычный текст (в т.ч. `fg.error`/`fg.warning`/`fg.success`/`fg.info`).
- **3:1** — крупный текст (≥24px обычной насыщенности либо ≥19px bold) и **не-текстовые UI-
  компоненты** — границы полей ввода, иконки-индикаторы состояния (критерий 1.4.11 Non-text
  Contrast).

Формула контраста (WCAG relative luminance):

```
L = 0.2126·R + 0.7152·G + 0.0722·B   (R,G,B — линеаризованные компоненты sRGB)
contrast = (L_light + 0.05) / (L_dark + 0.05)
```

На практике не считать вручную — прогонять через `wcag-contrast`/`polished` (`readableColor`,
`getContrast`) или онлайн-калькулятор, но **зафиксировать конкретное число в комментарии/доке**,
а не полагаться на «выглядит норм». Практика domwellbes:

- `fg.*` статусные — брать **700-й** оттенок палитры на светлом фоне (`_light`) и **300-й** на
  тёмном (`_dark`) — обе стороны дают ≥6,8:1 с запасом.
- `border.control` (граница инпута) — `gray.500` (light) / `gray.400` (dark), порог 3:1.
- `border.error`/`success`/`info` — как правило хватает 500-го оттенка (4,0–4,3:1). Ключевое
  исключение — **warning**: жёлтый/оранжевый заметно светлее остальных палитр той же ступени, и
  500-й даёт всего 2,77:1 — пришлось взять **600-й**, чтобы дотянуть до 4,35:1. Не переносить
  один и тот же номер ступени между статусами без проверки — у каждого своя кривая яркости.

## 4. Как проверить без визуального осмотра

Разбор собранной темы программно — через `system.tokens.getByName()` /
`system.getRecipe()` / `system.getSlotRecipe()`, а не скриншотами:

```ts
import { system } from '@/theme'

// какой реальный цвет стоит за токеном в конкретном режиме
system.tokens.getByName('colors.fg.error', { conditions: { colorMode: 'light' } })
system.tokens.getByName('colors.border.control', { conditions: { colorMode: 'dark' } })

// какие ключи резолвит рецепт компонента — что реально подставится в DOM
system.getRecipe('input')
system.getSlotRecipe('select')
```

Дальше — прогнать полученные hex через контраст-функцию (`wcag-contrast`/`polished`) в скрипте
или unit-тесте, и сравнить с порогом (4.5:1 текст / 3:1 UI-граница). Это ловит регресс
автоматически — в отличие от `theme:check`, который сейчас (на момент аудита) не проверяет
полноту статусных ключей контракта, только компилируемость темы.

Собирать список отсутствующих ключей — grep по `semanticTokens/colors.ts` приложения на
отсутствие вложенных `error`/`warning`/`success`/`info` внутри блоков `bg`/`fg`/`border`:

```bash
# внутри apps/<app>/src/theme — есть ли статусные ключи в bg/fg/border
grep -A 40 "^\s*(bg|fg|border):\s*{" apps/<app>/src/theme/semanticTokens/colors.ts
```

## 5. Текущее состояние по приложениям монорепо

Замер на 2026-08-19: 15 приложений имеют Chakra-тему с блоками `bg`/`fg`/`border` в
`semanticTokens`. Все, кроме domwellbes, заводят top-level `colorPalette`-контракт для
`brand`/`accent`/`success`/`warning`/`error`/`info` (`solid/contrast/fg/muted/subtle/emphasized/
focusRing/border`), но **не** закрывают статусные ключи внутри самих групп `bg`/`fg`/`border` —
то есть компоненты, обращающиеся напрямую к `fg.error`/`border.error`/`bg.error` (а не к
`colorPalette.*` через явный `colorPalette="error"`), получают дефолт Chakra
(`red`/`orange`/`green`/`blue`), а не палитру приложения.

| app                   | bg/fg/border группы                      | status keys внутри fg/border закрыты             | `border.control`                                                       | radii семантические (l1/l2/l3) |
| --------------------- | ---------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------ |
| domwellbes            | есть                                     | **да**                                           | **да** (gray.500/400)                                                  | **да**                         |
| aboi                  | есть                                     | нет                                              | нет                                                                    | нет                            |
| aira-web              | есть                                     | нет                                              | нет                                                                    | нет                            |
| aprel8008             | есть                                     | нет                                              | нет                                                                    | нет                            |
| archetest             | есть                                     | нет                                              | нет                                                                    | нет                            |
| driving-school        | есть                                     | нет                                              | нет                                                                    | нет                            |
| dsperevod             | есть                                     | нет                                              | нет                                                                    | нет                            |
| grandslamcup          | есть                                     | нет                                              | нет                                                                    | нет                            |
| pravda                | есть                                     | нет                                              | нет                                                                    | нет                            |
| studio                | есть                                     | нет                                              | нет                                                                    | нет                            |
| svoichuzhie           | есть (упрощённая)                        | нет                                              | нет                                                                    | нет                            |
| synth                 | есть (упрощённая)                        | нет                                              | нет                                                                    | нет                            |
| time                  | есть                                     | нет                                              | нет                                                                    | нет                            |
| animatrona (renderer) | есть, но не через `defineSemanticTokens` | нет (статусы в отдельных `status.*`/`callout.*`) | нет (`player.control` — цвет скраббера плеера, не роль границы инпута) | нет                            |

⚠️ Таблица фиксирует пробелы, а не приоритет их закрытия — не каждому приложению одинаково
нужен `border.control` (частота полей ввода/форм валидации сильно разнится между лендингом и
CRM). Прежде чем портировать паттерн из domwellbes в другое приложение — свериться с реальной
палитрой этого приложения: подбор 700-й/500-й/600-й ступени (§3) специфичен для конкретных
цветов, готовые числа domwellbes переносить нельзя, только метод.
