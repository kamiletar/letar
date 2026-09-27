import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from './'
import { SchemaFieldWithRelations } from './field-type-mapper'
import { RelationFieldProvider } from './relation-field-provider'
import type { SchemaFieldInfo } from './schema-traversal'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

interface Category {
  id: string
  name: string
  color: string
}

const categories: Category[] = [
  { id: 'a', name: 'Кровля', color: 'red' },
  { id: 'b', name: 'Фасад', color: 'blue' },
]

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

function field(fieldProps: Record<string, unknown> = {}): SchemaFieldInfo {
  return {
    path: 'categoryId',
    name: 'categoryId',
    zodType: 'string',
    required: false,
    constraints: {},
    ui: {
      title: 'Категория',
      fieldType: 'combobox',
      fieldProps: { relation: { model: 'Category', labelField: 'name' }, ...fieldProps },
    },
  }
}

function renderRelation(
  schemaField: SchemaFieldInfo,
  relationFieldProps?: Record<string, unknown>,
  initial = '',
  providerDescriptionField?: string,
) {
  render(
    <TestWrapper>
      <RelationFieldProvider
        relations={[{
          model: 'Category',
          useQuery: () => ({ data: categories, isLoading: false }),
          labelField: 'name',
          descriptionField: providerDescriptionField,
          fieldProps: relationFieldProps,
        }]}
      >
        <Form initialValue={{ categoryId: initial }} onSubmit={vi.fn()}>
          <SchemaFieldWithRelations field={schemaField} />
        </Form>
      </RelationFieldProvider>
    </TestWrapper>,
  )
}

const input = () => screen.getByRole('combobox') as HTMLInputElement

describe('Relation + Combobox (Z8)', () => {
  it('fieldType combobox: опции справочника — в списке, подпись выбранного — в инпуте', async () => {
    renderRelation(field(), undefined, 'b')
    await waitFor(() => expect(input().value).toBe('Фасад'))
    await userEvent.click(input())
    await waitFor(() => expect(screen.getByRole('option', { name: /Фасад/ })).toBeInTheDocument())
  })

  it('RelationConfig.fieldProps.renderOption получает запись справочника в option.data', async () => {
    const renderOption = vi.fn((option: { label: ReactNode; data?: Category }) => <b>{option.data?.color}</b>)
    renderRelation(field(), { renderOption })
    await userEvent.click(input())
    await waitFor(() => expect(screen.getByText('red')).toBeInTheDocument())
    expect(screen.getByText('blue')).toBeInTheDocument()
    expect(renderOption.mock.calls[0][0].data).toEqual(categories[0])
  })

  it('свои fieldProps поля сильнее общих из RelationConfig.fieldProps', async () => {
    renderRelation(
      field({ renderOption: (option: { data?: Category }) => <i>{`own-${option.data?.color}`}</i> }),
      { renderOption: () => <b>shared</b> },
    )
    await userEvent.click(input())
    await waitFor(() => expect(screen.getByText('own-red')).toBeInTheDocument())
    expect(screen.queryByText('shared')).toBeNull()
  })

  it('конфигурация relation не уходит в поле (нет атрибута relation в DOM)', async () => {
    renderRelation(field())
    expect(document.querySelector('[relation]')).toBeNull()
  })
})

describe('Relation + descriptionField (вопрос 44)', () => {
  const withMetaDescription = (descriptionField: string) =>
    field({ relation: { model: 'Category', labelField: 'name', descriptionField } })

  it('form.relation.descriptionField поля: вторая строка опции — поле записи, в инпуте после выбора только подпись', async () => {
    renderRelation(withMetaDescription('color'), undefined, 'b')
    await waitFor(() => expect(input().value).toBe('Фасад'))
    await userEvent.click(input())
    // Список отфильтрован по подписи выбранного («Фасад»): у неё вторая строка — цвет записи
    await waitFor(() => expect(screen.getByText('blue')).toBeInTheDocument())
    expect(input().value).toBe('Фасад')
  })

  it('без descriptionField второй строки нет', async () => {
    renderRelation(field())
    await userEvent.click(input())
    await waitFor(() => expect(screen.getByRole('option', { name: /Кровля/ })).toBeInTheDocument())
    expect(document.querySelector('[data-part="item-description"]')).toBeNull()
  })

  it('descriptionField провайдера сильнее описанного в meta поля', async () => {
    renderRelation(withMetaDescription('id'), undefined, '', 'color')
    await userEvent.click(input())
    await waitFor(() => expect(screen.getByText('red')).toBeInTheDocument())
    expect(screen.queryByText('a')).toBeNull()
  })

  it('локальный поиск Combobox находит по описанию', async () => {
    renderRelation(withMetaDescription('color'))
    await userEvent.click(input())
    fireEvent.change(input(), { target: { value: 'blu' } })
    await waitFor(() => expect(screen.getByRole('option', { name: /Фасад/ })).toBeInTheDocument())
    expect(screen.queryByRole('option', { name: /Кровля/ })).toBeNull()
  })
})
