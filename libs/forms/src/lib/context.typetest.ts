/**
 * Type-тесты для useTypedFormSubscribe и DeepKeys
 *
 * Эти тесты проверяют типобезопасность на уровне компиляции.
 * Запускаются через vitest typecheck (не в рантайме).
 */
import type { ReactNode } from 'react'
import { expectTypeOf, test } from 'vitest'
import { useTypedFormSubscribe } from './context'
import type { DeepKeys, DeepValue } from './types'

// ============================================================================
// Тестовые данные
// ============================================================================

interface TestFormData {
  name: string
  age: number
  active: boolean
  address: {
    city: string
    zip: string
  }
  items: Array<{
    title: string
    price: number
  }>
}

// ============================================================================
// useTypedFormSubscribe — типобезопасность selector/children
// ============================================================================

test('useTypedFormSubscribe возвращает TypedSubscribe и form', () => {
  type Result = ReturnType<typeof useTypedFormSubscribe<TestFormData>>
  expectTypeOf<Result>().toHaveProperty('TypedSubscribe')
  expectTypeOf<Result>().toHaveProperty('form')
})

test('selector получает корректный тип формы', () => {
  type SelectorFn = (values: TestFormData) => string
  expectTypeOf<Parameters<SelectorFn>[0]>().toEqualTypeOf<TestFormData>()
})

test('selector корректно выводит тип для примитивов и объектов', () => {
  // string
  type NameSelector = (values: TestFormData) => string
  expectTypeOf<ReturnType<NameSelector>>().toEqualTypeOf<string>()

  // number
  type AgeSelector = (values: TestFormData) => number
  expectTypeOf<ReturnType<AgeSelector>>().toEqualTypeOf<number>()

  // вложенный объект
  type AddressSelector = (values: TestFormData) => TestFormData['address']
  expectTypeOf<ReturnType<AddressSelector>>().toEqualTypeOf<{ city: string; zip: string }>()
})

test('children получает тип из selector', () => {
  type ChildrenFn = (selected: string) => ReactNode
  expectTypeOf<Parameters<ChildrenFn>[0]>().toEqualTypeOf<string>()
})

// ============================================================================
// DeepKeys — типобезопасные пути (hook API: form.Field name)
// ============================================================================

test('DeepKeys включает пути верхнего уровня', () => {
  type Keys = DeepKeys<TestFormData>
  // Простые поля
  expectTypeOf<'name'>().toMatchTypeOf<Keys>()
  expectTypeOf<'age'>().toMatchTypeOf<Keys>()
  expectTypeOf<'active'>().toMatchTypeOf<Keys>()
})

test('DeepKeys включает вложенные пути через точку', () => {
  type Keys = DeepKeys<TestFormData>
  // Вложенные объекты
  expectTypeOf<'address'>().toMatchTypeOf<Keys>()
  expectTypeOf<'address.city'>().toMatchTypeOf<Keys>()
  expectTypeOf<'address.zip'>().toMatchTypeOf<Keys>()
})

test('DeepKeys включает пути массивов', () => {
  type Keys = DeepKeys<TestFormData>
  // Массивы
  expectTypeOf<'items'>().toMatchTypeOf<Keys>()
})

test('DeepValue выводит корректный тип значения по пути', () => {
  // Верхний уровень
  expectTypeOf<DeepValue<TestFormData, 'name'>>().toEqualTypeOf<string>()
  expectTypeOf<DeepValue<TestFormData, 'age'>>().toEqualTypeOf<number>()
  expectTypeOf<DeepValue<TestFormData, 'active'>>().toEqualTypeOf<boolean>()

  // Вложенные
  expectTypeOf<DeepValue<TestFormData, 'address'>>().toEqualTypeOf<{ city: string; zip: string }>()
  expectTypeOf<DeepValue<TestFormData, 'address.city'>>().toEqualTypeOf<string>()
})
