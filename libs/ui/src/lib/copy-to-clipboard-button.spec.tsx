import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyToClipboardButton } from './copy-to-clipboard-button'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('CopyToClipboardButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('копирует текст и показывает подтверждение, затем сбрасывает подпись через 2с', async () => {
    renderWithProvider(<CopyToClipboardButton text="https://example.com/link" />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /скопировать/i }))
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/link')
    expect(screen.getByText('Скопировано')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('Скопировать')).toBeInTheDocument()
  })

  it('падает обратно на execCommand, если Clipboard API недоступен', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no focus')) },
    })
    const execCommand = vi.fn().mockReturnValue(true)
    Object.assign(document, { execCommand })

    renderWithProvider(<CopyToClipboardButton text="fallback text" label="Скопировать ссылку" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /скопировать ссылку/i }))
    })

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(screen.getByText('Скопировано')).toBeInTheDocument()
  })
})
