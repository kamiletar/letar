import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { PlayerLoadingOverlay } from './PlayerLoadingOverlay'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('PlayerLoadingOverlay', () => {
  it('ничего не рендерит, когда isLoading=false', () => {
    const { container } = renderWithProvider(<PlayerLoadingOverlay isLoading={false} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('рендерит оверлей со спиннером (span), когда isLoading=true', () => {
    const { container } = renderWithProvider(<PlayerLoadingOverlay isLoading={true} />)

    expect(container).not.toBeEmptyDOMElement()
    // Spinner рендерится как <span>, обёрнутый в Box-оверлей
    expect(container.querySelector('span')).toBeInTheDocument()
  })
})
