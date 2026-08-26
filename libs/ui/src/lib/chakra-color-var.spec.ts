import { describe, expect, it } from 'vitest'
import { chakraColorVar } from './chakra-color-var'

describe('chakraColorVar', () => {
  it.each([
    // реальные примеры из apps/animatrona-tracker, apps/animatrona-landing, libs/ui
    ['fg.muted', 'var(--chakra-colors-fg-muted)'],
    ['fg.subtle', 'var(--chakra-colors-fg-subtle)'],
    ['orange.fg', 'var(--chakra-colors-orange-fg)'],
    ['brand.500', 'var(--chakra-colors-brand-500)'],
    ['yellow.500', 'var(--chakra-colors-yellow-500)'],
    ['green.500', 'var(--chakra-colors-green-500)'],
    ['red.500', 'var(--chakra-colors-red-500)'],
    // многосоставные семантические токены (border.control, bg.panel из CLAUDE.md)
    ['border.control', 'var(--chakra-colors-border-control)'],
    ['bg.panel', 'var(--chakra-colors-bg-panel)'],
    // camelCase-сегмент — из .claude/docs/chakra-icon-as-prop-cleanup-pattern.md
    ['whiteAlpha.500', 'var(--chakra-colors-white-alpha-500)'],
    // однословный токен без точки (l1/l2/l3)
    ['l1', 'var(--chakra-colors-l1)'],
  ])('%s → %s', (token, expected) => {
    expect(chakraColorVar(token)).toBe(expected)
  })
})
