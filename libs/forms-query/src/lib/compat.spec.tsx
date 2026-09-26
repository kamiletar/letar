import { Form } from '@letar/forms'
import { FieldCombobox as ShadcnCombobox, FieldSelect as ShadcnSelect } from '@letar/forms-shadcn'
import { describe, expect, it } from 'vitest'
import { fromSearchQuery } from './from-search-query'
import { fromSelectedQuery } from './from-selected-query'
import { useLoaderQuery } from './use-loader-query'
import { useQueryOptions } from './use-query-options'

interface Category {
  id: string
  name: string
}

/**
 * Q6 — compile-only: результаты адаптеров принимаются полями Chakra-скина (`@letar/forms`) и
 * shadcn-скина (`@letar/forms-shadcn`). В рантайме ничего не рендерится — тест проходит, если проходит typecheck.
 */
describe('совместимость с обоими скинами (Q6)', () => {
  it('fieldProps, fromSearchQuery, fromSelectedQuery, useLoaderQuery принимаются полями', () => {
    const map = (c: Category) => ({ label: c.name, value: c.id })
    const useCategories = () => useQueryOptions<Category>({ data: [] }, map)
    const useSearch = fromSearchQuery<Category, { data?: Category[] }>(() => ({ data: [] }))
    const useSelected = fromSelectedQuery<Category, { data?: Category | null }>(() => ({ data: null }))

    const useDependentSearch = fromSearchQuery<Category, { data?: Category[] }>((_search, _options, _deps) => ({
      data: [],
    }))
    const useDependentSelected = fromSelectedQuery<Category, { data?: Category | null }>(
      (_value, _options, _deps) => ({ data: null }),
    )

    const ChakraFields = () => {
      const categories = useCategories()
      return (
        <>
          <Form.Field.Select name="a" {...categories.fieldProps} />
          <Form.Field.Combobox name="b" {...categories.fieldProps} />
          <Form.Field.Combobox
            name="c"
            useQuery={useSearch}
            useSelected={useSelected}
            getLabel={(c: Category) => c.name}
            getValue={(c: Category) => c.id}
          />
          <Form.Field.Combobox
            name="d"
            useQuery={useLoaderQuery(['k'], async () => [] as Category[])}
            getLabel={(c: Category) => c.name}
            getValue={(c: Category) => c.id}
          />
          {/* Этап З: зависимое поле — адаптеры принимают deps (QD1, QD2) */}
          <Form.Field.Combobox
            name="e"
            dependsOn="companyId"
            useQuery={useDependentSearch}
            useSelected={useDependentSelected}
            getLabel={(c: Category) => c.name}
            getValue={(c: Category) => c.id}
          />
          <Form.Field.Combobox
            name="f"
            dependsOn="companyId"
            useQuery={useLoaderQuery(['k'], async (_search, { deps }) => [{ id: String(deps['companyId']), name: '' }])}
            getLabel={(c: Category) => c.name}
            getValue={(c: Category) => c.id}
          />
        </>
      )
    }
    const ShadcnFields = () => {
      const categories = useCategories()
      return (
        <>
          <ShadcnSelect name="a" {...categories.fieldProps} />
          <ShadcnCombobox name="b" {...categories.fieldProps} />
        </>
      )
    }
    void ChakraFields
    void ShadcnFields
    expect(true).toBe(true)
  })
})
