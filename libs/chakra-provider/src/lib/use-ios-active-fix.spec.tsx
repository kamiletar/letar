import { render } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { RootChakraProvider } from './chakra-provider'
import { useIosActiveFix } from './use-ios-active-fix'

function Probe() {
  useIosActiveFix()
  return null
}

function touchstartCalls(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.filter(([type]) => type === 'touchstart')
}

describe('useIosActiveFix', () => {
  it('вешает пассивный touchstart-листенер на document', () => {
    const add = vi.spyOn(document, 'addEventListener')
    render(<Probe />)
    const calls = touchstartCalls(add)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.[2]).toEqual({ passive: true })
  })

  it('снимает тот же листенер при размонтировании', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    const { unmount } = render(<Probe />)
    unmount()
    const added = touchstartCalls(add)[0]?.[1]
    const removed = touchstartCalls(remove)
    expect(removed).toHaveLength(1)
    expect(removed[0]?.[1]).toBe(added)
  })

  it('в StrictMode не оставляет дублей: добавлений на одно больше, чем снятий', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    )
    expect(touchstartCalls(add).length - touchstartCalls(remove).length).toBe(1)
  })

  it('RootChakraProvider применяет фикс сам', () => {
    const add = vi.spyOn(document, 'addEventListener')
    render(<RootChakraProvider>{null}</RootChakraProvider>)
    expect(touchstartCalls(add)).toHaveLength(1)
  })
})
