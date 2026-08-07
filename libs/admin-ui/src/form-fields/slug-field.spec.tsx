import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { DeclarativeFormContext } from '@letar/forms'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSyncExternalStore } from 'react'
import { describe, expect, it } from 'vitest'
import { SlugField } from './slug-field'

interface TestValues {
  name: string
  slug: string
  [key: string]: unknown
}

/**
 * Минимальный мок формы, совместимый с DeclarativeFormContextValue.
 * SlugField читает form.state.values напрямую и рендерит поля через form.Field
 * (render-prop компонент вроде TanStack Form) — мок должен предоставлять оба.
 */
function createMockForm<T extends Record<string, unknown>>(initialValues: T) {
  let values = { ...initialValues }
  const listeners = new Set<() => void>()

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }
  const getSnapshot = () => values

  const setFieldValue = (name: string, value: unknown) => {
    values = { ...values, [name]: value }
    listeners.forEach((listener) => listener())
  }

  function Field({
    name,
    children,
  }: {
    name: string
    children: (field: { state: { value: string }; handleChange: (value: string) => void }) => React.ReactNode
  }) {
    const currentValues = useSyncExternalStore(subscribe, getSnapshot) as T
    const value = String(currentValues[name] ?? '')
    return <>{children({ state: { value }, handleChange: (v: string) => setFieldValue(name, v) })}</>
  }

  return {
    state: {
      get values() {
        return values
      },
    },
    setFieldValue,
    store: {
      subscribe: (listener: () => void) => {
        const unsubscribe = subscribe(listener)
        return { unsubscribe }
      },
    },
    Field,
  }
}

function renderSlugField(
  initialValues: TestValues,
  props: Partial<React.ComponentProps<typeof SlugField<TestValues>>> = {},
) {
  const form = createMockForm(initialValues)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const utils = render(
    <ChakraProvider value={defaultSystem}>
      <DeclarativeFormContext.Provider value={{ form } as any}>
        <SlugField<TestValues> titleName="name" slugName="slug" {...props} />
      </DeclarativeFormContext.Provider>
    </ChakraProvider>,
  )
  return { form, ...utils }
}

describe('SlugField', () => {
  it('рендерит поля названия и slug с дефолтными label', () => {
    renderSlugField({ name: '', slug: '' })

    expect(screen.getByText('Название')).toBeInTheDocument()
    expect(screen.getByText('Slug')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Введите название')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('auto-generated-slug')).toBeInTheDocument()
  })

  it('автогенерирует slug при вводе названия, пока связь активна (создание)', async () => {
    const user = userEvent.setup()
    const { form } = renderSlugField({ name: '', slug: '' })

    const titleInput = screen.getByPlaceholderText('Введите название')
    await user.type(titleInput, 'Мандала Солнца')

    expect(form.state.values.slug).toBe('mandala-solntsa')
    expect(screen.getByDisplayValue('mandala-solntsa')).toBeInTheDocument()
  })

  it('отвязывает slug от названия при ручном редактировании поля slug', async () => {
    const user = userEvent.setup()
    const { form } = renderSlugField({ name: 'Товар', slug: '' })

    const slugInput = screen.getByPlaceholderText('auto-generated-slug')
    await user.type(slugInput, 'custom-slug')

    expect(form.state.values.slug).toBe('custom-slug')

    const titleInput = screen.getByPlaceholderText('Введите название')
    await user.type(titleInput, '-обновлено')

    // Slug больше не меняется автоматически, т.к. связь отвязана
    expect(form.state.values.slug).toBe('custom-slug')
  })

  it('регенерирует slug из текущего названия по клику на кнопку обновления', async () => {
    const user = userEvent.setup()
    const { form } = renderSlugField({ name: 'Товар', slug: 'старый-слаг' }, { isEditing: true })

    await user.click(screen.getByRole('button', { name: 'Сгенерировать из названия' }))

    expect(form.state.values.slug).toBe('tovar')
  })

  it('при повторной привязке через кнопку связи регенерирует slug из названия', async () => {
    const user = userEvent.setup()
    const { form } = renderSlugField({ name: 'Товар', slug: 'другой-slug' }, { isEditing: true })

    // isEditing + slug не совпадает с slugify(title) => связь изначально неактивна
    expect(screen.getByRole('button', { name: 'Привязать к названию' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Привязать к названию' }))

    expect(form.state.values.slug).toBe('tovar')
    expect(screen.getByRole('button', { name: 'Отвязать от названия' })).toBeInTheDocument()
  })

  it('в режиме редактирования со совпадающим slug сразу считает связь активной', () => {
    renderSlugField({ name: 'Товар', slug: 'tovar' }, { isEditing: true })

    expect(screen.getByRole('button', { name: 'Отвязать от названия' })).toBeInTheDocument()
  })
})
