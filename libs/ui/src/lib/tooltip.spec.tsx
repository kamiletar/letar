import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Tooltip } from './tooltip'

import type { ReactNode } from 'react'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('Tooltip', () => {
  it('рендерит triggerэлемент (children)', () => {
    renderWithProvider(
      <Tooltip content="Подсказка">
        <button>Наведи на меня</button>
      </Tooltip>,
    )
    expect(screen.getByRole('button', { name: 'Наведи на меня' })).toBeInTheDocument()
  })

  it('содержимое подсказки не видно до наведения', () => {
    renderWithProvider(
      <Tooltip content="Секретный текст">
        <button>Триггер</button>
      </Tooltip>,
    )
    expect(screen.queryByText('Секретный текст')).not.toBeInTheDocument()
  })

  it('показывает содержимое при наведении (openDelay=0)', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <Tooltip content="Текст подсказки" openDelay={0} closeDelay={0}>
        <button>Триггер</button>
      </Tooltip>,
    )

    await user.hover(screen.getByRole('button', { name: 'Триггер' }))

    expect(await screen.findByText('Текст подсказки')).toBeInTheDocument()
  })

  it('disabled=true рендерит только children, без обёртки в тултип', () => {
    renderWithProvider(
      <Tooltip content="Не должно отображаться" disabled>
        <button>Триггер</button>
      </Tooltip>,
    )
    expect(screen.getByRole('button', { name: 'Триггер' })).toBeInTheDocument()
    expect(screen.queryByText('Не должно отображаться')).not.toBeInTheDocument()
  })

  it('disabled=true не показывает содержимое даже при наведении', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <Tooltip content="Не должно отображаться" disabled openDelay={0}>
        <button>Триггер</button>
      </Tooltip>,
    )

    await user.hover(screen.getByRole('button', { name: 'Триггер' }))

    expect(screen.queryByText('Не должно отображаться')).not.toBeInTheDocument()
  })
})
