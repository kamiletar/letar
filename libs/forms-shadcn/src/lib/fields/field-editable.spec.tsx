import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldEditable } from './field-editable'

describe('FieldEditable (shadcn)', () => {
  it('показывает превью со значением, клик переключает в режим редактирования', () => {
    render(
      <TestForm defaultValues={{ title: 'Заголовок' }}>
        <FieldEditable name="title" label="Название" />
      </TestForm>,
    )

    expect(screen.getByText('Название')).toBeInTheDocument()
    expect(screen.getByText('Заголовок')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Заголовок'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('пустое значение показывает placeholder в превью', () => {
    render(
      <TestForm defaultValues={{ title: '' }}>
        <FieldEditable name="title" placeholder="Нажмите, чтобы добавить" />
      </TestForm>,
    )

    expect(screen.getByText('Нажмите, чтобы добавить')).toBeInTheDocument()
  })

  it('ввод текста и Enter сохраняет значение и возвращает в превью', () => {
    render(
      <TestForm defaultValues={{ title: 'Старое' }}>
        <FieldEditable name="title" />
      </TestForm>,
    )

    fireEvent.click(screen.getByText('Старое'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Новое' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('Новое')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('multiline рендерит textarea', () => {
    render(
      <TestForm defaultValues={{ description: 'Текст' }}>
        <FieldEditable name="description" multiline />
      </TestForm>,
    )

    fireEvent.click(screen.getByText('Текст'))
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA')
  })

  it('activationMode="none" сразу рендерит инпут без превью', () => {
    render(
      <TestForm defaultValues={{ title: 'Значение' }}>
        <FieldEditable name="title" activationMode="none" />
      </TestForm>,
    )

    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  // @ts-expect-error — activationMode обязан быть 'click' | 'none', негативный контроль
  const _typeCheck = <FieldEditable name="title" activationMode="dblclick" />
})
