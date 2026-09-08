// globals: true в vitest.config.mts — describe, expect, it доступны глобально
import type { TVPressableState } from '@/types/react-native'

import { focusableStyle } from './tvStyles'

/** Хелпер: минимальный TVPressableState с заданным focused */
function state(focused: boolean): TVPressableState {
  return { pressed: false, focused }
}

describe('focusableStyle', () => {
  it('возвращает функцию style-callback', () => {
    const styleFn = focusableStyle([{ padding: 8 }], { borderColor: '#fff' })
    expect(typeof styleFn).toBe('function')
  })

  it('без фокуса не включает focusedStyle', () => {
    const base = { padding: 8 }
    const focusedStyle = { borderColor: '#fff' }
    const styleFn = focusableStyle([base], focusedStyle)

    expect(styleFn(state(false))).toEqual([base, false])
  })

  it('в фокусе включает focusedStyle после base', () => {
    const base = { padding: 8 }
    const focusedStyle = { borderColor: '#fff' }
    const styleFn = focusableStyle([base], focusedStyle)

    expect(styleFn(state(true))).toEqual([base, focusedStyle])
  })

  it('добавляет несколько base-стилей в исходном порядке', () => {
    const first = { padding: 8 }
    const second = { margin: 4 }
    const focusedStyle = { borderColor: '#fff' }
    const styleFn = focusableStyle([first, second], focusedStyle)

    expect(styleFn(state(false))).toEqual([first, second, false])
  })

  it('добавляет after-стили после focusedStyle', () => {
    const base = { padding: 8 }
    const focusedStyle = { borderColor: '#fff' }
    const after = { opacity: 1 }
    const styleFn = focusableStyle([base], focusedStyle, [after])

    expect(styleFn(state(true))).toEqual([base, focusedStyle, after])
    expect(styleFn(state(false))).toEqual([base, false, after])
  })

  it('без after по умолчанию не добавляет лишних элементов', () => {
    const styleFn = focusableStyle([{ padding: 8 }], { borderColor: '#fff' })

    expect(styleFn(state(true))).toHaveLength(2)
  })
})
