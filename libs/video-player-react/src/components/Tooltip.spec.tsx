import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Tooltip } from './Tooltip'

function renderWithChakra(ui: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('Tooltip', () => {
  it('рендерит children как есть когда disabled=true', () => {
    renderWithChakra(
      <Tooltip content="Подсказка" disabled>
        <button type="button">Триггер</button>
      </Tooltip>,
    )

    expect(screen.getByRole('button', { name: 'Триггер' })).toBeInTheDocument()
    // Контент подсказки не должен присутствовать в DOM вовсе — обёртка не рендерится
    expect(screen.queryByText('Подсказка')).not.toBeInTheDocument()
  })

  it('рендерит триггер когда disabled не задан (по умолчанию false)', () => {
    renderWithChakra(
      <Tooltip content="Подсказка">
        <button type="button">Триггер</button>
      </Tooltip>,
    )

    expect(screen.getByRole('button', { name: 'Триггер' })).toBeInTheDocument()
  })

  it('содержимое подсказки не видно в DOM до наведения (открывается лениво через Portal)', () => {
    renderWithChakra(
      <Tooltip content="Скрытая подсказка">
        <button type="button">Триггер</button>
      </Tooltip>,
    )

    expect(screen.queryByText('Скрытая подсказка')).not.toBeInTheDocument()
  })
})
