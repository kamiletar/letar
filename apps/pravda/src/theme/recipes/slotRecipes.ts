import { defineRecipe, defineSlotRecipe } from '@chakra-ui/react'
import { pressScale } from '@letar/ui'

// ⚠️ `slots` здесь ОБЯЗАН перечислять слоты в том же порядке, что и настоящая anatomy
// компонента (`menuAnatomy`/`tabsAnatomy`/... в `@chakra-ui/react/dist/esm/anatomy.js`), а не
// только те, что реально переопределяются. `createSystem(defaultConfig, appConfig)` мержит
// конфиги через `mergeWith`, а её `merge()` для двух массивов проходит только `source.length`
// элементов и перезаписывает `target[i] = source[i]` по ИНДЕКСУ — не по значению. Короткий или
// переставленный массив молча заменяет элементы настоящей anatomy на свои имена по позиции,
// теряя реальные слоты (например `positioner` у `menu`) и создавая дубликаты. Разбор и образец —
// `apps/domwellbes/src/theme/recipes/controls.ts`.
const menuAnatomyOrder = [
  'arrow',
  'arrowTip',
  'content',
  'contextTrigger',
  'indicator',
  'item',
  'itemGroup',
  'itemGroupLabel',
  'itemIndicator',
  'itemText',
  'positioner',
  'separator',
  'trigger',
  'triggerItem',
  'itemCommand',
] as const

const tabsAnatomyOrder = ['root', 'trigger', 'list', 'content', 'contentGroup', 'indicator'] as const

/**
 * IconButton recipe с тактильной обратной связью
 *
 * Используется для:
 * - BookmarkButton в статьях
 * - Кнопок в DocumentActions
 * - Иконок в Header (поиск, закладки)
 *
 * ⚠️ Raw-значения, не `pressScale` (`@letar/ui`) — icon-button под исключением «мелкие
 * поверхности» из JSDoc `pressScale` (диапазон шкалы рассчитан на поверхности от размера обычной
 * кнопки и крупнее, мелкому элементу та же относительная просадка читается как отсутствие
 * обратной связи).
 */
export const iconButtonRecipe = defineRecipe({
  base: {
    transition: 'all 0.1s ease-out',
    _active: {
      transform: 'scale(0.85)',
    },
    _disabled: {
      _active: {
        transform: 'none',
      },
    },
  },
  variants: {
    size: {
      xs: {
        _active: { transform: 'scale(0.8)' },
      },
      sm: {
        _active: { transform: 'scale(0.85)' },
      },
      md: {
        _active: { transform: 'scale(0.9)' },
      },
      lg: {
        _active: { transform: 'scale(0.92)' },
      },
    },
  },
})

/**
 * Accordion slot recipe с тактильной обратной связью
 *
 * Используется для:
 * - NavSection в Sidebar (collapsible категории)
 */
export const accordionRecipe = defineSlotRecipe({
  slots: ['root', 'item', 'itemTrigger', 'itemContent', 'itemIndicator', 'itemBody'],
  base: {
    itemTrigger: {
      transition: 'all 0.1s ease-out',
      _active: {
        bg: 'bg.subtle',
        transform: pressScale['2xl'],
      },
    },
  },
})

/**
 * Menu slot recipe с тактильной обратной связью
 *
 * Используется для:
 * - DocumentActions (печать, PDF)
 */
export const menuRecipe = defineSlotRecipe({
  slots: [...menuAnatomyOrder],
  base: {
    item: {
      transition: 'all 0.1s ease-out',
      _active: {
        bg: 'bg.muted',
        transform: pressScale.lg,
      },
    },
  },
})

/**
 * Tabs slot recipe с тактильной обратной связью
 */
export const tabsRecipe = defineSlotRecipe({
  slots: [...tabsAnatomyOrder],
  base: {
    trigger: {
      transition: 'all 0.1s ease-out',
      _active: {
        transform: pressScale.xs,
      },
    },
  },
})

/**
 * Tag slot recipe с тактильной обратной связью для интерактивных тегов
 *
 * ⚠️ `closeTrigger` — raw-значение, не `pressScale`: мелкая поверхность (close-триггер тега),
 * то же исключение JSDoc `pressScale`, что и `iconButtonRecipe` выше.
 */
export const tagRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'closeTrigger', 'startElement', 'endElement'],
  base: {
    root: {
      transition: 'all 0.1s ease-out',
    },
    closeTrigger: {
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      _active: {
        transform: 'scale(0.85)',
      },
    },
  },
})
