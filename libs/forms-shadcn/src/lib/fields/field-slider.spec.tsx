import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldSlider } from './field-slider'

describe('FieldSlider (shadcn)', () => {
  it('рендерит с меткой и начальным значением', () => {
    render(
      <TestForm defaultValues={{ volume: 40 }}>
        <FieldSlider name="volume" label="Громкость" min={0} max={100} />
      </TestForm>,
    )

    expect(screen.getByText('Громкость')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '40')
  })

  it('показывает значение рядом с меткой при showValue', () => {
    render(
      <TestForm defaultValues={{ volume: 40 }}>
        <FieldSlider name="volume" label="Громкость" showValue />
      </TestForm>,
    )

    expect(screen.getByText('40')).toBeInTheDocument()
  })
})
