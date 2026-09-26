import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { FormI18nProvider } from '@letar/forms-react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, type ReactNode, type RefObject } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

import { Form } from '../../'
import type { AppFormApi } from '../../types'

// Вопрос 50 (§14): очистка Select/Combobox пишет `null` для nullable-схемы, иначе `''` (у числового Select — `0`)

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>
    <FormI18nProvider locale="ru">{children}</FormI18nProvider>
  </ChakraProvider>
)

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const formRef: RefObject<AppFormApi | null> = createRef<AppFormApi | null>()
const values = () => formRef.current!.state.values as Record<string, unknown>

const options = [
  { label: 'Альфа', value: 'A' },
  { label: 'Бета', value: 'B' },
]

const numberOptions = [
  { label: 'Один', value: 1 },
  { label: 'Два', value: 2 },
]

const schema = z.object({
  plain: z.string().optional(),
  nullableField: z.string().nullable(),
  numberNullable: z.number().nullable(),
  numberPlain: z.number().optional(),
  parent: z.string(),
  child: z.string().nullable(),
  childPlain: z.string().optional(),
})

const clearButton = () => document.querySelector('[data-part="clear-trigger"]') as HTMLElement

describe('Field.Select — пустое значение при очистке', () => {
  it('nullable-схема: собственная кнопка очистки пишет null', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ nullableField: 'A' }} schema={schema} onSubmit={vi.fn()} formRef={formRef}>
          <Form.Field.Select name="nullableField" options={options} />
        </Form>
      </TestWrapper>,
    )

    await userEvent.click(clearButton())

    await waitFor(() => expect(values().nullableField).toBeNull())
  })

  it('не nullable-схема: очистка пишет пустую строку, как раньше', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ plain: 'A' }} schema={schema} onSubmit={vi.fn()} formRef={formRef}>
          <Form.Field.Select name="plain" options={options} />
        </Form>
      </TestWrapper>,
    )

    await userEvent.click(clearButton())

    await waitFor(() => expect(values().plain).toBe(''))
  })

  it('числовой Select: nullable — null, не nullable — 0', async () => {
    const { unmount } = render(
      <TestWrapper>
        <Form initialValue={{ numberNullable: 1 }} schema={schema} onSubmit={vi.fn()} formRef={formRef}>
          <Form.Field.Select name="numberNullable" valueType="number" options={numberOptions} />
        </Form>
      </TestWrapper>,
    )
    await userEvent.click(clearButton())
    await waitFor(() => expect(values().numberNullable).toBeNull())
    unmount()

    render(
      <TestWrapper>
        <Form initialValue={{ numberPlain: 1 }} schema={schema} onSubmit={vi.fn()} formRef={formRef}>
          <Form.Field.Select name="numberPlain" valueType="number" options={numberOptions} />
        </Form>
      </TestWrapper>,
    )
    await userEvent.click(clearButton())
    await waitFor(() => expect(values().numberPlain).toBe(0))
  })

  it('без schema у формы: пустая строка (как раньше)', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ nullableField: 'A' }} onSubmit={vi.fn()} formRef={formRef}>
          <Form.Field.Select name="nullableField" options={options} />
        </Form>
      </TestWrapper>,
    )

    await userEvent.click(clearButton())

    await waitFor(() => expect(values().nullableField).toBe(''))
  })

  it('автоочистка зависимого nullable-поля пишет null, не nullable — пустую строку', async () => {
    render(
      <TestWrapper>
        <Form
          initialValue={{ parent: 'A', child: 'x', childPlain: 'y' }}
          schema={schema}
          onSubmit={vi.fn()}
          formRef={formRef}
        >
          <Form.Field.Select name="parent" label="Родитель" options={options} />
          <Form.Field.Select
            name="child"
            label="Ребёнок"
            dependsOn="parent"
            options={[{ label: 'Икс', value: 'x' }]}
          />
          <Form.Field.Select
            name="childPlain"
            label="Ребёнок 2"
            dependsOn="parent"
            options={[{ label: 'Игрек', value: 'y' }]}
          />
        </Form>
      </TestWrapper>,
    )

    await userEvent.click(screen.getByRole('combobox', { name: /Родитель/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'Бета' }))

    await waitFor(() => expect(values().child).toBeNull())
    expect(values().childPlain).toBe('')
  })
})

describe('Field.Combobox — пустое значение при очистке', () => {
  it('nullable-схема: очистка выбранного значения пишет null', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ nullableField: 'A' }} schema={schema} onSubmit={vi.fn()} formRef={formRef}>
          <Form.Field.Combobox name="nullableField" options={options} />
        </Form>
      </TestWrapper>,
    )
    await waitFor(() => expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('Альфа'))

    await userEvent.click(clearButton())

    await waitFor(() => expect(values().nullableField).toBeNull())
  })

  it('не nullable-схема: очистка пишет пустую строку', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ plain: 'A' }} schema={schema} onSubmit={vi.fn()} formRef={formRef}>
          <Form.Field.Combobox name="plain" options={options} />
        </Form>
      </TestWrapper>,
    )
    await waitFor(() => expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('Альфа'))

    await userEvent.click(clearButton())

    await waitFor(() => expect(values().plain).toBe(''))
  })

  it('автоочистка зависимого nullable-поля пишет null', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ parent: 'A', child: 'x' }} schema={schema} onSubmit={vi.fn()} formRef={formRef}>
          <Form.Field.Select name="parent" label="Родитель" options={options} />
          <Form.Field.Combobox
            name="child"
            label="Ребёнок"
            dependsOn="parent"
            options={[{ label: 'Икс', value: 'x' }]}
          />
        </Form>
      </TestWrapper>,
    )

    await userEvent.click(screen.getByRole('combobox', { name: /Родитель/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'Бета' }))

    await waitFor(() => expect(values().child).toBeNull())
  })
})
