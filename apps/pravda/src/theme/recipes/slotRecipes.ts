import { defineRecipe, defineSlotRecipe } from '@chakra-ui/react'

/**
 * IconButton recipe с тактильной обратной связью
 *
 * Используется для:
 * - BookmarkButton в статьях
 * - Кнопок в DocumentActions
 * - Иконок в Header (поиск, закладки)
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
        transform: 'scale(0.99)',
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
  slots: [
    'root',
    'trigger',
    'content',
    'item',
    'itemText',
    'itemCommand',
    'separator',
    'group',
    'groupLabel',
    'indicator',
    'itemIndicator',
  ],
  base: {
    item: {
      transition: 'all 0.1s ease-out',
      _active: {
        bg: 'bg.muted',
        transform: 'scale(0.98)',
      },
    },
  },
})

/**
 * Tabs slot recipe с тактильной обратной связью
 */
export const tabsRecipe = defineSlotRecipe({
  slots: ['root', 'list', 'trigger', 'content', 'indicator'],
  base: {
    trigger: {
      transition: 'all 0.1s ease-out',
      _active: {
        transform: 'scale(0.95)',
      },
    },
  },
})

/**
 * Tag slot recipe с тактильной обратной связью для интерактивных тегов
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
