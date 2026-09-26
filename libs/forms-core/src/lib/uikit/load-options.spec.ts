import { describe, expectTypeOf, it } from 'vitest'
import type { LoadContext, LoadOptionsFn, LoadSelectedFn, OptionsSourceProps } from './index'

interface Category {
  id: string
  name: string
}

describe('контракт источников данных (compile-only)', () => {
  it('LoadOptionsFn получает строку поиска и контекст с signal, отдаёт записи', () => {
    const load: LoadOptionsFn<Category> = async (search, ctx) => {
      expectTypeOf(search).toBeString()
      expectTypeOf(ctx).toEqualTypeOf<LoadContext>()
      expectTypeOf(ctx.signal).toEqualTypeOf<AbortSignal>()
      return [{ id: search, name: 'x' }]
    }
    expectTypeOf(load).returns.resolves.toEqualTypeOf<Category[]>()
  })

  it('LoadSelectedFn отдаёт запись или null', () => {
    const load: LoadSelectedFn<Category> = async (value) => (value ? { id: value, name: 'x' } : null)
    expectTypeOf(load).returns.resolves.toEqualTypeOf<Category | null>()
  })

  it('OptionsSourceProps — options и loading', () => {
    const source: OptionsSourceProps<{ value: string; label: string }> = { options: [], loading: false }
    expectTypeOf(source.loading).toBeBoolean()
  })
})
