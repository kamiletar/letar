import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormActions } from './form-actions'

import type { ReactNode } from 'react'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('FormActions', () => {
  it('рендерит основное и дополнительное действие', () => {
    renderWithProvider(
      <FormActions secondary={<button>Удалить</button>}>
        <button>Сохранить</button>
      </FormActions>,
    )
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument()
  })

  it('основное действие идёт в DOM первым — Tab не начинается с «Удалить»', () => {
    renderWithProvider(
      <FormActions secondary={<button>Удалить</button>}>
        <button>Сохранить</button>
      </FormActions>,
    )
    const names = screen.getAllByRole('button').map((b) => b.textContent)
    expect(names).toEqual(['Сохранить', 'Удалить'])
  })

  it('без дополнительного действия рендерит только основное', () => {
    renderWithProvider(
      <FormActions>
        <button>Создать</button>
      </FormActions>,
    )
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('пробрасывает остальные пропсы на корневой контейнер', () => {
    const { container } = renderWithProvider(
      <FormActions data-testid="footer">
        <button>Создать</button>
      </FormActions>,
    )
    expect(container.firstElementChild).toHaveAttribute('data-testid', 'footer')
  })
})
