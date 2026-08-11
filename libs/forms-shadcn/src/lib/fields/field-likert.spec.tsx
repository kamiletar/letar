import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldLikert } from './field-likert'

const anchors = ['Совсем не согласен', 'Не согласен', 'Нейтрально', 'Согласен', 'Полностью согласен']

describe('FieldLikert (shadcn)', () => {
  it('рендерит метку и все точки шкалы', () => {
    render(
      <TestForm defaultValues={{ experience: undefined }}>
        <FieldLikert name="experience" label="Оцените опыт" anchors={anchors} />
      </TestForm>,
    )

    expect(screen.getByText('Оцените опыт')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByText('Полностью согласен')).toBeInTheDocument()
  })

  it('выбирает точку по клику', () => {
    render(
      <TestForm defaultValues={{ experience: undefined }}>
        <FieldLikert name="experience" label="Оцените опыт" anchors={anchors} />
      </TestForm>,
    )

    fireEvent.click(screen.getByText('Нейтрально'))
    const radios = screen.getAllByRole('radio')
    expect(radios[2]).toHaveAttribute('aria-checked', 'true')
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
  })

  it('showNumbers показывает номера точек', () => {
    render(
      <TestForm defaultValues={{ experience: undefined }}>
        <FieldLikert name="experience" label="Оцените опыт" anchors={anchors} showNumbers />
      </TestForm>,
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('disabled блокирует выбор', () => {
    render(
      <TestForm defaultValues={{ experience: undefined }}>
        <FieldLikert name="experience" label="Оцените опыт" anchors={anchors} disabled />
      </TestForm>,
    )

    fireEvent.click(screen.getByText('Нейтрально'))
    expect(screen.getAllByRole('radio')[2]).toHaveAttribute('aria-checked', 'false')
  })
})
