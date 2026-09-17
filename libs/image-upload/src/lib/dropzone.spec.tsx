/**
 * Клавиатурная доступность Dropzone: Tab ставит фокус на зону, Enter/Space открывают тот же
 * диалог выбора файла, что и клик мышью (PLAN_OPEN_QUESTIONS.md domwellbes, задача про bulk-импорт
 * CSV/XLSX через Dropzone).
 */

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Dropzone } from './dropzone'

describe('Dropzone', () => {
  it('доступна с клавиатуры: role="button", tabIndex=0', () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={() => {}} />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    expect(zone.tabIndex).toBe(0)
  })

  it('Enter открывает системный диалог выбора файла (клик по скрытому input)', () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={() => {}} />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    fireEvent.keyDown(zone, { key: 'Enter' })

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('Space открывает системный диалог выбора файла', () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={() => {}} />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    fireEvent.keyDown(zone, { key: ' ' })

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('отключённая зона не реагирует на Enter и не попадает в Tab-последовательность', () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={() => {}} disabled />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    expect(zone.tabIndex).toBe(-1)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')
    fireEvent.keyDown(zone, { key: 'Enter' })
    expect(clickSpy).not.toHaveBeenCalled()
  })
})
