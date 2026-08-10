import type { AddressProvider } from '@letar/forms-core/address'
import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FieldCity } from './field-city'

function createMockProvider(): AddressProvider {
  return {
    getSuggestions: vi.fn(async (query: string) => {
      if (!query.includes('Мос')) { return [] }
      return [{ label: 'Москва', value: 'Москва', data: { city: 'Москва' } }]
    }),
  }
}

describe('FieldCity (shadcn)', () => {
  it('рендерит label и placeholder', () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldCity name="city" label="Город" provider={createMockProvider()} />
      </TestForm>,
    )

    expect(screen.getByText('Город')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Введите город...')
  })

  it('загружает подсказки от провайдера с bounds city/settlement', async () => {
    const provider = createMockProvider()
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldCity name="city" provider={provider} debounceMs={0} />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Мос' } })

    await waitFor(() => {
      expect(provider.getSuggestions).toHaveBeenCalledWith(
        'Мос',
        expect.objectContaining({ bounds: { from: 'city', to: 'settlement' } }),
      )
    })
  })

  it('выбор подсказки извлекает city из data и записывает как строку', async () => {
    const provider = createMockProvider()
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldCity name="city" provider={provider} debounceMs={0} />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Мос' } })
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Москва' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('option', { name: 'Москва' }))

    expect(screen.getByRole('combobox')).toHaveValue('Москва')
  })

  it('стирание текста сразу очищает значение поля', () => {
    render(
      <TestForm defaultValues={{ city: 'Казань' }}>
        <FieldCity name="city" provider={createMockProvider()} />
      </TestForm>,
    )

    const input = screen.getByRole('combobox')
    expect(input).toHaveValue('Казань')
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue('')
  })

  it('не запрашивает подсказки короче minChars', () => {
    const provider = createMockProvider()
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldCity name="city" provider={provider} minChars={2} debounceMs={0} />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'М' } })
    expect(provider.getSuggestions).not.toHaveBeenCalled()
  })

  // @ts-expect-error — token обязан быть string, негативный контроль типов
  const _typeCheck = <FieldCity name="city" token={42} />
})
