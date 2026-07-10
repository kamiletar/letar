import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldFileUpload', () => {
  describe('рендеринг', () => {
    it('рендерит в варианте dropzone по умолчанию', () => {
      render(
        <Form initialValue={{ file: null }} onSubmit={vi.fn()}>
          <Form.Field.FileUpload name="file" label="Файл" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Файл')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <Form initialValue={{ file: null }} onSubmit={vi.fn()}>
          <Form.Field.FileUpload name="file" label="Загрузка документа" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Загрузка документа')).toBeInTheDocument()
    })

    it('устанавливает data-field-name', () => {
      const { container } = render(
        <Form initialValue={{ file: null }} onSubmit={vi.fn()}>
          <Form.Field.FileUpload name="file" />
        </Form>,
        { wrapper: TestWrapper }
      )

      const fieldElement = container.querySelector('[data-field-name="file"]')
      expect(fieldElement).toBeInTheDocument()
    })
  })

  describe('варианты отображения', () => {
    it('рендерит вариант button', () => {
      render(
        <Form initialValue={{ file: null }} onSubmit={vi.fn()}>
          <Form.Field.FileUpload name="file" variant="button" buttonText="Выбрать файл" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Выбрать файл')).toBeInTheDocument()
    })

    it('рендерит вариант dropzone с кастомными текстами', () => {
      render(
        <Form initialValue={{ file: null }} onSubmit={vi.fn()}>
          <Form.Field.FileUpload
            name="file"
            variant="dropzone"
            dropzoneLabel="Перетащите файл сюда"
            dropzoneDescription="или нажмите для выбора"
          />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Перетащите файл сюда')).toBeInTheDocument()
      expect(screen.getByText('или нажмите для выбора')).toBeInTheDocument()
    })
  })

  describe('ограничения файлов', () => {
    it('принимает accept как строку', () => {
      const { container } = render(
        <Form initialValue={{ file: null }} onSubmit={vi.fn()}>
          <Form.Field.FileUpload name="file" accept="image/*" />
        </Form>,
        { wrapper: TestWrapper }
      )

      const input = container.querySelector('input[type="file"]')
      expect(input).toHaveAttribute('accept', 'image/*')
    })

    it('принимает accept как массив', () => {
      const { container } = render(
        <Form initialValue={{ file: null }} onSubmit={vi.fn()}>
          <Form.Field.FileUpload name="file" accept={['image/jpeg', 'image/png']} />
        </Form>,
        { wrapper: TestWrapper }
      )

      const input = container.querySelector('input[type="file"]')
      expect(input).toHaveAttribute('accept', 'image/jpeg,image/png')
    })

    it('устанавливает maxFiles через multiple', () => {
      const { container } = render(
        <Form initialValue={{ files: [] }} onSubmit={vi.fn()}>
          <Form.Field.FileUpload name="files" maxFiles={5} />
        </Form>,
        { wrapper: TestWrapper }
      )

      const input = container.querySelector('input[type="file"]')
      // maxFiles > 1 → multiple attribute
      expect(input).toHaveAttribute('multiple')
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      const { container } = render(
        <Form initialValue={{ file: null }} onSubmit={vi.fn()}>
          <Form.Field.FileUpload name="file" disabled />
        </Form>,
        { wrapper: TestWrapper }
      )

      const input = container.querySelector('input[type="file"]')
      expect(input).toBeDisabled()
    })

    it('наследует disabled из формы', () => {
      const { container } = render(
        <Form initialValue={{ file: null }} onSubmit={vi.fn()} disabled>
          <Form.Field.FileUpload name="file" />
        </Form>,
        { wrapper: TestWrapper }
      )

      const input = container.querySelector('input[type="file"]')
      expect(input).toBeDisabled()
    })
  })

  describe('helperText', () => {
    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ file: null }} onSubmit={vi.fn()}>
          <Form.Field.FileUpload name="file" helperText="Максимум 10 МБ" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Максимум 10 МБ')).toBeInTheDocument()
    })
  })

  describe('безопасность', () => {
    it('принимает конфигурацию безопасности', () => {
      // Не выбрасывает ошибку при передаче security конфигурации
      expect(() => {
        render(
          <Form initialValue={{ file: null }} onSubmit={vi.fn()}>
            <Form.Field.FileUpload
              name="file"
              security={{
                maxSize: '10MB',
                allowedTypes: ['image/jpeg', 'application/pdf'],
                stripMetadata: true,
                renameFile: true,
              }}
            />
          </Form>,
          { wrapper: TestWrapper }
        )
      }).not.toThrow()
    })
  })
})
