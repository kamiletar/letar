import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { DeclarativeFormContext } from '@letar/forms'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { SeoField } from './seo-field'

interface TestValues {
  name: string
  description: string
  metaTitle: string
  metaDescription: string
  [key: string]: unknown
}

/**
 * Минимальный мок формы, совместимый с DeclarativeFormContextValue:
 * поддерживает form.state.values, form.setFieldValue и form.store.subscribe,
 * как использует SeoField.
 */
function createMockForm<T extends Record<string, unknown>>(initialValues: T) {
  let values = { ...initialValues }
  const listeners = new Set<() => void>()

  const form = {
    state: {
      get values() {
        return values
      },
    },
    setFieldValue: (name: string, value: unknown) => {
      values = { ...values, [name]: value }
      listeners.forEach((listener) => listener())
    },
    store: {
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return { unsubscribe: () => listeners.delete(listener) }
      },
    },
  }

  return form
}

function renderSeoField(
  initialValues: TestValues,
  props: Partial<React.ComponentProps<typeof SeoField<TestValues>>> = {},
) {
  const form = createMockForm(initialValues)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const utils = render(
    <ChakraProvider value={defaultSystem}>
      <DeclarativeFormContext.Provider value={{ form } as any}>
        <SeoField<TestValues>
          titleSourceName="name"
          descriptionSourceName="description"
          metaTitleName="metaTitle"
          metaDescriptionName="metaDescription"
          {...props}
        />
      </DeclarativeFormContext.Provider>
    </ChakraProvider>,
  )
  return { form, ...utils }
}

describe('SeoField', () => {
  it('рендерит поля с дефолтными label и начальными значениями из формы', () => {
    renderSeoField({
      name: 'Товар',
      description: 'Описание товара',
      metaTitle: 'Meta title',
      metaDescription: 'Meta desc',
    })

    expect(screen.getByText('Meta Title')).toBeInTheDocument()
    expect(screen.getByText('Meta Description')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Meta title')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Meta desc')).toBeInTheDocument()
  })

  it('копирует название в metaTitle по клику на кнопку копирования', async () => {
    const user = userEvent.setup()
    const { form } = renderSeoField({ name: 'Название товара', description: '', metaTitle: '', metaDescription: '' })

    await user.click(screen.getByRole('button', { name: 'Скопировать из названия' }))

    expect(screen.getByDisplayValue('Название товара')).toBeInTheDocument()
    expect(form.state.values.metaTitle).toBe('Название товара')
  })

  it('обрезает скопированный title до maxTitleLength', async () => {
    const user = userEvent.setup()
    const longTitle = 'а'.repeat(80)
    const { form } = renderSeoField(
      { name: longTitle, description: '', metaTitle: '', metaDescription: '' },
      { maxTitleLength: 10 },
    )

    await user.click(screen.getByRole('button', { name: 'Скопировать из названия' }))

    expect(form.state.values.metaTitle).toBe(longTitle.slice(0, 10))
  })

  it('удаляет HTML-теги при копировании description в metaDescription', async () => {
    const user = userEvent.setup()
    const { form } = renderSeoField({
      name: '',
      description: '<p>Описание <b>товара</b></p>',
      metaTitle: '',
      metaDescription: '',
    })

    await user.click(screen.getByRole('button', { name: 'Скопировать из описания' }))

    expect(form.state.values.metaDescription).toBe('Описание товара')
  })

  it('отвязывает связь title при ручном редактировании metaTitle', async () => {
    const user = userEvent.setup()
    renderSeoField({ name: 'Название', description: '', metaTitle: '', metaDescription: '' })

    // По умолчанию (не редактирование) связь активна — кнопка предлагает отвязать
    expect(screen.getByRole('button', { name: 'Отвязать от названия' })).toBeInTheDocument()

    const metaTitleInput = screen.getByPlaceholderText('SEO заголовок')
    await user.type(metaTitleInput, 'X')

    expect(screen.getByRole('button', { name: 'Привязать к названию' })).toBeInTheDocument()
  })

  it('автоматически обновляет metaTitle при изменении title-источника, пока связь активна', async () => {
    const { form } = renderSeoField({ name: 'Старое название', description: '', metaTitle: '', metaDescription: '' })

    act(() => {
      form.setFieldValue('name', 'Новое название')
    })

    expect(await screen.findByDisplayValue('Новое название')).toBeInTheDocument()
  })

  it('не обновляет metaTitle автоматически, если связь отвязана', async () => {
    const user = userEvent.setup()
    const { form } = renderSeoField({ name: 'Название', description: '', metaTitle: '', metaDescription: '' })

    const metaTitleInput = screen.getByPlaceholderText('SEO заголовок')
    await user.type(metaTitleInput, 'Ручной ввод')

    act(() => {
      form.setFieldValue('name', 'Совсем другое название')
    })

    expect(screen.queryByDisplayValue('Совсем другое название')).not.toBeInTheDocument()
  })

  it('показывает счётчик символов metaTitle', () => {
    renderSeoField({ name: '', description: '', metaTitle: 'Заголовок', metaDescription: '' }, { maxTitleLength: 60 })

    expect(screen.getByText('9/60')).toBeInTheDocument()
  })
})
