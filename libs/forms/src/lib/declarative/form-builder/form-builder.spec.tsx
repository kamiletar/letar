import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { FormBuilder, type FormBuilderConfig } from './form-builder'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FormBuilder', () => {
  it('должен рендерить поля из конфигурации', () => {
    const config: FormBuilderConfig = {
      fields: [
        { type: 'string', name: 'firstName', label: 'Имя' },
        { type: 'string', name: 'lastName', label: 'Фамилия' },
      ],
    }

    render(
      <TestWrapper>
        <FormBuilder config={config} initialValue={{ firstName: '', lastName: '' }} onSubmit={vi.fn()} />
      </TestWrapper>
    )

    expect(screen.getByText('Имя')).toBeInTheDocument()
    expect(screen.getByText('Фамилия')).toBeInTheDocument()
  })

  it('должен рендерить секции с заголовками', () => {
    const config: FormBuilderConfig = {
      sections: [
        {
          title: 'Личные данные',
          fields: [{ type: 'string', name: 'name', label: 'Имя' }],
        },
        {
          title: 'Контакты',
          fields: [{ type: 'string', name: 'email', label: 'Email' }],
        },
      ],
    }

    render(
      <TestWrapper>
        <FormBuilder config={config} initialValue={{ name: '', email: '' }} onSubmit={vi.fn()} />
      </TestWrapper>
    )

    expect(screen.getByText('Личные данные')).toBeInTheDocument()
    expect(screen.getByText('Контакты')).toBeInTheDocument()
  })

  it('должен генерировать label из name если не указан', () => {
    const config: FormBuilderConfig = {
      fields: [{ type: 'string', name: 'firstName' }],
    }

    render(
      <TestWrapper>
        <FormBuilder config={config} initialValue={{ firstName: '' }} onSubmit={vi.fn()} />
      </TestWrapper>
    )

    expect(screen.getByText('First Name')).toBeInTheDocument()
  })

  it('должен рендерить числовые поля', () => {
    const config: FormBuilderConfig = {
      fields: [{ type: 'number', name: 'age', label: 'Возраст' }],
    }

    render(
      <TestWrapper>
        <FormBuilder config={config} initialValue={{ age: 25 }} onSubmit={vi.fn()} />
      </TestWrapper>
    )

    expect(screen.getByText('Возраст')).toBeInTheDocument()
  })

  it('должен рендерить checkbox поля', () => {
    const config: FormBuilderConfig = {
      fields: [{ type: 'checkbox', name: 'agree', label: 'Согласен' }],
    }

    render(
      <TestWrapper>
        <FormBuilder config={config} initialValue={{ agree: false }} onSubmit={vi.fn()} />
      </TestWrapper>
    )

    expect(screen.getByText('Согласен')).toBeInTheDocument()
  })

  it('должен рендерить select поля', () => {
    const config: FormBuilderConfig = {
      fields: [
        {
          type: 'select',
          name: 'role',
          label: 'Роль',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'User', value: 'user' },
          ],
        },
      ],
    }

    render(
      <TestWrapper>
        <FormBuilder config={config} initialValue={{ role: 'user' }} onSubmit={vi.fn()} />
      </TestWrapper>
    )

    expect(screen.getByText('Роль')).toBeInTheDocument()
  })

  it('должен рендерить кнопку отправки с кастомным текстом', () => {
    const config: FormBuilderConfig = {
      fields: [{ type: 'string', name: 'name' }],
    }

    render(
      <TestWrapper>
        <FormBuilder config={config} initialValue={{ name: '' }} onSubmit={vi.fn()} submitLabel="Создать" />
      </TestWrapper>
    )

    expect(screen.getByText('Создать')).toBeInTheDocument()
  })

  it('должен рендерить кнопку отправки по умолчанию', () => {
    const config: FormBuilderConfig = {
      fields: [{ type: 'string', name: 'name' }],
    }

    render(
      <TestWrapper>
        <FormBuilder config={config} initialValue={{ name: '' }} onSubmit={vi.fn()} />
      </TestWrapper>
    )

    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('должен рендерить textarea поля', () => {
    const config: FormBuilderConfig = {
      fields: [{ type: 'textarea', name: 'description', label: 'Описание', rows: 5 }],
    }

    render(
      <TestWrapper>
        <FormBuilder config={config} initialValue={{ description: '' }} onSubmit={vi.fn()} />
      </TestWrapper>
    )

    expect(screen.getByText('Описание')).toBeInTheDocument()
  })

  it('должен рендерить password поля', () => {
    const config: FormBuilderConfig = {
      fields: [{ type: 'password', name: 'password', label: 'Пароль' }],
    }

    render(
      <TestWrapper>
        <FormBuilder config={config} initialValue={{ password: '' }} onSubmit={vi.fn()} />
      </TestWrapper>
    )

    expect(screen.getByText('Пароль')).toBeInTheDocument()
  })
})
