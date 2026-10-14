import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
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

function renderCity(props: Record<string, unknown> = {}, initial = '', onSubmit = vi.fn()) {
  render(
    <TestWrapper>
      <Form initialValue={{ city: initial }} onSubmit={onSubmit}>
        <Form.Field.City name="city" label="Город" {...props} />
        <button type="submit">go</button>
      </Form>
    </TestWrapper>,
  )
  return onSubmit
}

const input = () => screen.getByRole('combobox') as HTMLInputElement

async function search(text: string) {
  await userEvent.click(input())
  fireEvent.change(input(), { target: { value: text } })
}

async function submitted(onSubmit: ReturnType<typeof vi.fn>) {
  await userEvent.click(screen.getByText('go'))
  await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  return onSubmit.mock.calls[0]![0] as { city: string }
}

describe('Form.Field.City — режим словаря', () => {
  it('без провайдера по умолчанию работает справочник', async () => {
    renderCity()
    await userEvent.click(input())
    // Пустой запрос: самые крупные города
    await waitFor(() => expect(screen.getByRole('option', { name: /Москва/ })).toBeInTheDocument())
  })

  it('поиск по подстроке без учёта регистра и ё/е; регион показан под названием', async () => {
    renderCity()
    await search('королев')
    const option = await screen.findByRole('option', { name: /Королёв/ })
    expect(option).toHaveTextContent('Московская область')
  })

  it('выбранный город попадает в форму строкой-названием', async () => {
    const onSubmit = renderCity()
    await search('тверь')
    await userEvent.click(await screen.findByRole('option', { name: /Тверь/ }))
    expect(await submitted(onSubmit)).toEqual({ city: 'Тверь' })
  })

  it('одноимённые города различаются регионом и в значении', async () => {
    const onSubmit = renderCity()
    await search('советск')
    const kaliningrad = await screen.findByRole('option', { name: /Калининградская область/ })
    await userEvent.click(kaliningrad)
    expect(await submitted(onSubmit)).toEqual({ city: 'Советск, Калининградская область' })
  })

  it('«Другой город» — пункт со свободным вводом; введённый текст становится значением', async () => {
    const onSubmit = renderCity({ otherLabel: 'Другой город' })
    await search('Бишкек')
    await userEvent.click(await screen.findByRole('option', { name: /Другой город.*Бишкек/ }))
    expect(await submitted(onSubmit)).toEqual({ city: 'Бишкек' })
  })

  it('allowOther={false} — список закрытый, пункта нет', async () => {
    renderCity({ allowOther: false, otherLabel: 'Другой город' })
    await search('Бишкек')
    await screen.findByText(/Nothing found|Ничего не найдено/)
    expect(screen.queryByRole('option', { name: /Другой город/ })).toBeNull()
  })

  it('начальное значение из справочника показано в поле', async () => {
    renderCity({}, 'Тверь')
    await waitFor(() => expect(input().value).toBe('Тверь'))
  })

  it('начальное значение для повторяющегося названия показывает название без региона', async () => {
    renderCity({}, 'Советск, Калининградская область')
    await waitFor(() => expect(input().value).toBe('Советск'))
  })

  it('значение вне справочника показано как есть', async () => {
    renderCity({}, 'Бишкек')
    await waitFor(() => expect(input().value).toBe('Бишкек'))
  })

  it('source="provider" включает прежний режим подсказок: обычный текстовый ввод', () => {
    renderCity({ source: 'provider' })
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
