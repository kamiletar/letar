import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// FieldRichText загружается лениво (lazy() + dynamic import) — реализация с @tiptap/*
// резолвится асинхронно, поэтому проверки после render() требуют waitFor/findBy.
// Поле грузится лениво (`import()`): на холодном кэше vite-трансформ тяжёлой зависимости (tiptap) занимает секунды, и на
// загруженной машине первый тест упирался в таймаут (5 с по умолчанию). Прогреваем модуль в хуке со своим таймаутом —
// тесты стартуют с готовым модулем, а провал загрузки виден как провал хука, а не «случайного» теста.
beforeAll(async () => {
  await import('./field-rich-text-impl')
}, 60_000)

describe('FieldRichText', () => {
  describe('rendering', () => {
    it('рендерит rich text editor', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ content: '' }} onSubmit={vi.fn()}>
            <Form.Field.RichText name="content" />
          </Form>
        </TestWrapper>,
      )

      // Tiptap рендерит contenteditable div
      await waitFor(
        () => {
          expect(document.querySelector('[contenteditable]')).toBeInTheDocument()
        },
        { timeout: 10000 },
      )
    })

    it('рендерит label', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ content: '' }} onSubmit={vi.fn()}>
            <Form.Field.RichText name="content" label="Описание" />
          </Form>
        </TestWrapper>,
      )

      expect(await screen.findByText('Описание')).toBeInTheDocument()
    })
  })
})
