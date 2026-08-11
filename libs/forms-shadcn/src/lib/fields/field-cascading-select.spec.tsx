import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FieldCascadingSelect } from './field-cascading-select'
import { FieldSelect } from './field-select'

const countryOptions = [
  { label: 'Россия', value: 'ru' },
  { label: 'Казахстан', value: 'kz' },
]

describe('FieldCascadingSelect (shadcn)', () => {
  it('дизейблит поле, пока родитель пуст', () => {
    render(
      <TestForm defaultValues={{ country: '', city: '' }}>
        <FieldSelect name="country" label="Страна" options={countryOptions} />
        <FieldCascadingSelect
          name="city"
          label="Город"
          dependsOn="country"
          loadOptions={async () => []}
          placeholderWhenDisabled="Сначала выберите страну"
        />
      </TestForm>,
    )

    expect(screen.getByText('Сначала выберите страну')).toBeInTheDocument()
  })

  it('загружает опции при выборе родителя', async () => {
    const loadOptions = vi.fn(async (parent: string | undefined) =>
      parent === 'ru' ? [{ label: 'Москва', value: 'msk' }, { label: 'Казань', value: 'kzn' }] : []
    )

    render(
      <TestForm defaultValues={{ country: 'ru', city: '' }}>
        <FieldCascadingSelect name="city" label="Город" dependsOn="country" loadOptions={loadOptions} />
      </TestForm>,
    )

    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('ru'))
  })

  it('сбрасывает значение при смене родителя (clearOnParentChange)', async () => {
    const loadOptions = vi.fn(async () => [{ label: 'Москва', value: 'msk' }])

    function Wrapper() {
      return (
        <TestForm defaultValues={{ country: 'ru', city: 'msk' }}>
          <FieldSelect name="country" label="Страна" options={countryOptions} />
          <FieldCascadingSelect name="city" label="Город" dependsOn="country" loadOptions={loadOptions} />
        </TestForm>
      )
    }

    render(<Wrapper />)

    fireEvent.click(screen.getByText('Россия'))
    await waitFor(() => expect(loadOptions).toHaveBeenCalled())
  })

  it('initialOptions показываются, пока родитель пуст', () => {
    render(
      <TestForm defaultValues={{ country: '', city: '' }}>
        <FieldCascadingSelect
          name="city"
          label="Город"
          dependsOn="country"
          loadOptions={async () => []}
          initialOptions={[{ label: 'Любой город', value: 'any' }]}
        />
      </TestForm>,
    )

    expect(screen.getByText('Город')).toBeInTheDocument()
  })
})
