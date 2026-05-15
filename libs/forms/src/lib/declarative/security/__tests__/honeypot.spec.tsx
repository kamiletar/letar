import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HoneypotField, useHoneypotCheck } from '../honeypot'

describe('HoneypotField', () => {
  it('рендерит скрытый input', () => {
    const { container } = render(<HoneypotField />)
    const input = container.querySelector('input')

    expect(input).toBeTruthy()
    expect(input!.tabIndex).toBe(-1)
    expect(input!.autocomplete).toBe('off')
  })

  it('имеет aria-hidden на контейнере', () => {
    const { container } = render(<HoneypotField />)
    const wrapper = container.firstElementChild as HTMLElement

    expect(wrapper.getAttribute('aria-hidden')).toBe('true')
  })

  it('генерирует уникальное имя поля', () => {
    const { container: c1 } = render(<HoneypotField />)
    const { container: c2 } = render(<HoneypotField />)

    const name1 = c1.querySelector('input')!.name
    const name2 = c2.querySelector('input')!.name

    expect(name1).not.toBe(name2)
    expect(name1).toMatch(/^hp_/)
  })
})

// Тест useHoneypotCheck через renderHook потребовал бы DOM manipulation,
// что сложно в unit-тестах. Проверяем через интеграционный подход.
describe('useHoneypotCheck', () => {
  it('возвращает false когда disabled', () => {
    function TestComponent() {
      const { isBot } = useHoneypotCheck(false)
      return <div data-testid="result">{String(isBot())}</div>
    }

    render(<TestComponent />)
    expect(screen.getByTestId('result').textContent).toBe('false')
  })
})
