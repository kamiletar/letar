import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { BuildVersion } from './build-version'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('BuildVersion', () => {
  it('рендерит версию с префиксом v', () => {
    renderWithProvider(<BuildVersion version="1.2.3" />)
    expect(screen.getByText('v1.2.3')).toBeInTheDocument()
  })

  it('не рендерится, если версия не передана', () => {
    const { container } = renderWithProvider(<BuildVersion />)
    expect(container).toBeEmptyDOMElement()
  })

  it('не рендерится для пустой строки', () => {
    const { container } = renderWithProvider(<BuildVersion version="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('прокидывает дополнительные пропсы', () => {
    renderWithProvider(<BuildVersion version="2.0.0" data-testid="build-version" />)
    expect(screen.getByTestId('build-version')).toHaveTextContent('v2.0.0')
  })
})
