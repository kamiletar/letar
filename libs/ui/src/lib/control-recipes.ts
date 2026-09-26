import { defineRecipe, defineSlotRecipe } from '@chakra-ui/react'

/**
 * Рецепты рамки элементов управления (поля ввода, select, чекбокс, радио).
 *
 * Стоковые рецепты Chakra рисуют рамку поля цветом `border` (у чекбокса и радио —
 * `border.emphasized`). В типичной палитре это `gray.200`/`gray.300`: 1,4–1,8:1 на белом.
 * WCAG 2.2 §1.4.11 требует 3:1, когда рамка сама обозначает поле ввода, поэтому все такие
 * рецепты переводятся на отдельную роль (по умолчанию `border.control`).
 *
 * Контракт: приложение само определяет этот токен в `semanticTokens.colors` своей темы
 * (иначе рамка получит пустой цвет). Декоративные рамки (карточка, разделитель, вкладки)
 * остаются на `border`: там граница не единственный признак и порог 3:1 не действует.
 *
 * Модуль намеренно не импортирует `createSystem` и React — он безопасен для SSR-барреля
 * ([chakra-multi-system-ssr-barrel-trap](/.claude/docs/chakra-multi-system-ssr-barrel-trap.md)).
 */

export interface ControlRecipesOptions {
  /** Семантический токен цвета рамки поля. По умолчанию `border.control`. */
  borderToken?: string
}

// ⚠️ `slots` ОБЯЗАН перечислять слоты в том же порядке, что и настоящая anatomy компонента,
// а не только те, что переопределяются: `createSystem` мержит массивы по ИНДЕКСУ, короткий
// список молча вычёркивает слоты — `.claude/docs/chakra-slot-recipe-array-merge-truncation.md`.
// Порядок `select` — `selectAnatomy` в `@chakra-ui/react/dist/esm/anatomy.js`.
const selectAnatomyOrder = [
  'label',
  'positioner',
  'trigger',
  'indicator',
  'clearTrigger',
  'item',
  'itemText',
  'itemIndicator',
  'itemGroup',
  'itemGroupLabel',
  'list',
  'content',
  'root',
  'control',
  'valueText',
  'indicatorGroup',
] as const

// `nativeSelect` копирует стили триггера из `select` в момент определения рецепта,
// поэтому переопределение `select` на него не распространяется — нужен свой блок.
const nativeSelectAnatomyOrder = ['root', 'field', 'indicator'] as const

// Порядок — `@zag-js/combobox` `combobox.anatomy.js`, плюс `indicatorGroup`/`empty`,
// добавленные Chakra через `.extendWith(...)`.
const comboboxAnatomyOrder = [
  'root',
  'clearTrigger',
  'content',
  'control',
  'input',
  'item',
  'itemGroup',
  'itemGroupLabel',
  'itemIndicator',
  'itemText',
  'label',
  'list',
  'positioner',
  'trigger',
  'indicatorGroup',
  'empty',
] as const

/**
 * Собирает рецепты контролов с рамкой из заданного семантического токена.
 * Результат подключается в `theme.recipes` и `theme.slotRecipes` темы приложения.
 */
export function createControlRecipes({ borderToken = 'border.control' }: ControlRecipesOptions = {}) {
  // Токен приходит строкой, а `strictTokens` типизирует значения закрытым списком токенов.
  const border = borderToken as 'border'

  const input = defineRecipe({
    variants: {
      variant: {
        outline: { borderColor: border },
        flushed: { borderBottomColor: border },
      },
    },
  })

  const textarea = defineRecipe({
    variants: {
      variant: {
        outline: { borderColor: border },
        flushed: { borderBottomColor: border },
      },
    },
  })

  // Вариант по умолчанию у чекбокса — `solid`, а не `outline`; невыбранная рамка берётся
  // именно оттуда, поэтому правим оба.
  const checkmark = defineRecipe({
    variants: {
      variant: {
        solid: { borderColor: border },
        outline: { borderColor: border },
      },
    },
  })

  const radiomark = defineRecipe({
    base: {
      // Chakra зашивает сюда литерал `red.500` в обход `border.error` — единственное место
      // среди контролов, где невалидное состояние не читает семантический токен.
      _invalid: { borderColor: 'border.error' },
    },
    variants: {
      variant: {
        solid: { borderColor: border },
      },
    },
  })

  const select = defineSlotRecipe({
    slots: [...selectAnatomyOrder],
    variants: {
      variant: {
        outline: { trigger: { borderColor: border } },
      },
    },
  })

  const nativeSelect = defineSlotRecipe({
    slots: [...nativeSelectAnatomyOrder],
    variants: {
      variant: {
        outline: { field: { borderColor: border } },
      },
    },
  })

  const combobox = defineSlotRecipe({
    slots: [...comboboxAnatomyOrder],
    variants: {
      variant: {
        outline: {
          input: { borderColor: border },
          trigger: { borderColor: border },
        },
      },
    },
  })

  return {
    /** Значения для `theme.recipes`. */
    recipes: { input, textarea, checkmark, radiomark },
    /** Значения для `theme.slotRecipes`. */
    slotRecipes: { select, nativeSelect, combobox },
  }
}
