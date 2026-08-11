import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('объединяет классы через clsx', () => {
    const hidden = false
    expect(cn('a', hidden && 'b', 'c')).toBe('a c')
  })

  it('разрешает конфликты Tailwind через twMerge', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
