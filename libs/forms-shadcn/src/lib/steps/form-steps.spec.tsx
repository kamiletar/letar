import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldString } from '../fields/field-string'
import { FormSteps } from './index'

function ThreeStepForm() {
  return (
    <TestForm defaultValues={{ firstName: '', email: '' }}>
      <FormSteps>
        <FormSteps.Indicator />
        <FormSteps.Step title="Личное">
          <FieldString name="firstName" label="Имя" required />
        </FormSteps.Step>
        <FormSteps.Step title="Контакты">
          <FieldString name="email" label="Email" />
        </FormSteps.Step>
        <FormSteps.CompletedContent>Готово!</FormSteps.CompletedContent>
        <FormSteps.Navigation />
      </FormSteps>
    </TestForm>
  )
}

function firstNameInput(): HTMLInputElement {
  return document.querySelector('input[data-field-name="firstName"]') as HTMLInputElement
}

function emailInput(): HTMLInputElement | null {
  return document.querySelector('input[data-field-name="email"]')
}

describe('FormSteps (shadcn)', () => {
  it('показывает содержимое первого шага и его заголовок в индикаторе', () => {
    render(<ThreeStepForm />)

    expect(firstNameInput()).toBeInTheDocument()
    expect(emailInput()).not.toBeInTheDocument()
    expect(screen.getByText('Личное')).toBeInTheDocument()
    expect(screen.getByText('Контакты')).toBeInTheDocument()
  })

  it('кнопка «Далее» без обязательного значения не переключает шаг (валидация блокирует)', () => {
    render(<ThreeStepForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
    expect(firstNameInput()).toBeInTheDocument()
  })

  it('заполненное обязательное поле пропускает на следующий шаг', async () => {
    render(<ThreeStepForm />)

    fireEvent.change(firstNameInput(), { target: { value: 'Иван' } })
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))

    await screen.findByText('Контакты')
    expect(emailInput()).toBeInTheDocument()
    expect(firstNameInput()).not.toBeInTheDocument()
  })

  it('на последнем шаге кнопка «Далее» становится «Отправить»', async () => {
    render(<ThreeStepForm />)

    fireEvent.change(firstNameInput(), { target: { value: 'Иван' } })
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))

    expect(await screen.findByRole('button', { name: 'Отправить' })).toBeInTheDocument()
  })

  it('клик «Назад» на втором шаге возвращает на первый', async () => {
    render(<ThreeStepForm />)

    fireEvent.change(firstNameInput(), { target: { value: 'Иван' } })
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
    await screen.findByRole('button', { name: 'Назад' })

    fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
    expect(await screen.findByText('Личное')).toBeInTheDocument()
    expect(firstNameInput()).toBeInTheDocument()
  })
})
