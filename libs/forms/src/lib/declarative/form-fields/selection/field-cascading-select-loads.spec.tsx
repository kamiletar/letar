import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { FormI18nProvider } from '@letar/forms-react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

// Проверка допущения этапа З (PLAN §18.1): умолчание `initialOptions = []` создаёт новый массив на каждом рендере
// поля и стоит в зависимостях эффекта загрузки — перерисовка внешнего компонента не должна перезапускать запрос.

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

describe('Field.CascadingSelect — лишние загрузки', () => {
  it('перерисовка внешнего компонента без смены родителя не перезапускает loadOptions', async () => {
    const loadOptions = vi.fn(async () => [{ label: 'Москва', value: 'msk' }])

    const Host = () => {
      const [, setTick] = useState(0)
      return (
        <ChakraProvider value={defaultSystem}>
          <button type="button" data-testid="rerender" onClick={() => setTick((n) => n + 1)} />
          <FormI18nProvider locale="ru">
            <Form initialValue={{ country: 'ru', city: '' }} onSubmit={vi.fn()}>
              <Form.Field.String name="country" label="Страна" />
              <Form.Field.CascadingSelect name="city" label="Город" dependsOn="country" loadOptions={loadOptions} />
            </Form>
          </FormI18nProvider>
        </ChakraProvider>
      )
    }

    render(<Host />)
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1))

    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByTestId('rerender'))
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(loadOptions).toHaveBeenCalledTimes(1)
  })
})
