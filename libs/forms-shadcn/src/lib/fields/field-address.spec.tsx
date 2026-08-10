import type { AddressProvider } from '@letar/forms-core/address'
import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FieldAddress } from './field-address'

function createMockProvider(): AddressProvider {
  return {
    getSuggestions: vi.fn(async (query: string) => {
      if (!query.includes('Мос')) { return [] }
      return [
        { label: 'г Москва, ул Тверская', value: 'г Москва, ул Тверская', data: { city: 'Москва' } },
      ]
    }),
  }
}

describe('FieldAddress (shadcn)', () => {
  it('рендерит label и placeholder', () => {
    render(
      <TestForm defaultValues={{ address: '' }}>
        <FieldAddress name="address" label="Адрес" placeholder="Введите адрес..." provider={createMockProvider()} />
      </TestForm>,
    )

    expect(screen.getByText('Адрес')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Введите адрес...')
  })

  it('загружает подсказки от провайдера при вводе (после minChars)', async () => {
    const provider = createMockProvider()
    render(
      <TestForm defaultValues={{ address: '' }}>
        <FieldAddress name="address" label="Адрес" provider={provider} debounceMs={0} />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Мос' } })

    await waitFor(() => {
      expect(provider.getSuggestions).toHaveBeenCalledWith('Мос', expect.objectContaining({ count: 10 }))
    })
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'г Москва, ул Тверская' })).toBeInTheDocument()
    })
  })

  it('выбор подсказки записывает значение и закрывает список', async () => {
    const provider = createMockProvider()
    render(
      <TestForm defaultValues={{ address: '' }}>
        <FieldAddress name="address" label="Адрес" provider={provider} debounceMs={0} />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Мос' } })
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'г Москва, ул Тверская' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('option', { name: 'г Москва, ул Тверская' }))

    expect(screen.getByRole('combobox')).toHaveValue('г Москва, ул Тверская')
    await waitFor(() => {
      expect(screen.queryByRole('option')).not.toBeInTheDocument()
    })
  })

  it('valueOnly возвращает только строку', async () => {
    const provider = createMockProvider()
    render(
      <TestForm defaultValues={{ address: '' }}>
        <FieldAddress name="address" label="Адрес" provider={provider} valueOnly debounceMs={0} />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Мос' } })
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'г Москва, ул Тверская' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('option', { name: 'г Москва, ул Тверская' }))

    expect(screen.getByRole('combobox')).toHaveValue('г Москва, ул Тверская')
  })

  it('не запрашивает подсказки короче minChars', () => {
    const provider = createMockProvider()
    render(
      <TestForm defaultValues={{ address: '' }}>
        <FieldAddress name="address" label="Адрес" provider={provider} minChars={3} debounceMs={0} />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Мо' } })
    expect(provider.getSuggestions).not.toHaveBeenCalled()
  })

  // @ts-expect-error — token обязан быть string, negative control проверяет реальную типизацию пропов
  const _typeCheck = <FieldAddress name="address" token={42} />
})
