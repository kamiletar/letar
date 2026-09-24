import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

import { ColorModeSelect } from './color-mode-select'

const setTheme = vi.fn()

// jsdom не знает ResizeObserver, а индикатор SegmentGroup (zag) подписывается на него
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', setTheme, resolvedTheme: 'light', systemTheme: 'light' }),
}))

function renderSelect(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('ColorModeSelect', () => {
  it('по умолчанию подписи русские', () => {
    renderSelect(<ColorModeSelect />)
    expect(screen.getByText('Светлая')).toBeTruthy()
    expect(screen.getByText('Система')).toBeTruthy()
    expect(screen.getByText('Тёмная')).toBeTruthy()
  })

  it('labels переопределяет подписи, не заданные остаются по умолчанию', () => {
    renderSelect(<ColorModeSelect labels={{ light: 'Light', dark: 'Dark', system: 'Auto' }} />)
    expect(screen.getByText('Light')).toBeTruthy()
    expect(screen.getByText('Auto')).toBeTruthy()
    expect(screen.getByText('Dark')).toBeTruthy()
    expect(screen.queryByText('Система')).toBeNull()
  })

  it('частичный labels: остальные режимы берут русские', () => {
    renderSelect(<ColorModeSelect labels={{ system: 'Авто' }} />)
    expect(screen.getByText('Авто')).toBeTruthy()
    expect(screen.getByText('Светлая')).toBeTruthy()
  })

  it('iconOnly кладёт кастомную подпись в title', () => {
    const { container } = renderSelect(<ColorModeSelect iconOnly labels={{ dark: 'Dark' }} />)
    expect(container.querySelector('[title="Dark"]')).toBeTruthy()
  })
})
