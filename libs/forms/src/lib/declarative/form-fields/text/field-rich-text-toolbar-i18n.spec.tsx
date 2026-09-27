import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { FormI18nProvider } from '@letar/forms-react'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Form } from '../../'

/**
 * Подписи кнопок тулбара `Form.Field.RichText` (Chakra-скин) идут через общий словарь
 * `formToolbar.*` (`@letar/forms-react`, `toolbar-strings.ts`): без провайдера — английский
 * (контракт Chakra-скина), `locale="ru"` — русский, как у shadcn-версии поля.
 *
 * Кнопки `link`/`image` сюда не входят — рендер подменяет их на `LinkPopover`/`ImagePopover` со
 * своими независимыми aria-label (не через `TOOLBAR_CONFIG.labelKey`), это не задача этой сессии.
 */

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// Поле грузится лениво (`import()`) — прогреваем модуль своим таймаутом, см. field-rich-text.spec.tsx
beforeAll(async () => {
  await import('./field-rich-text-impl')
}, 60_000)

function renderField(i18n?: { locale: string; t?: (key: string) => string }) {
  const form = (
    <Form initialValue={{ content: '' }} onSubmit={vi.fn()}>
      <Form.Field.RichText name="content" />
    </Form>
  )
  render(
    <TestWrapper>
      {i18n ? <FormI18nProvider locale={i18n.locale} t={i18n.t}>{form}</FormI18nProvider> : form}
    </TestWrapper>,
  )
}

describe('FieldRichText (Chakra) — подписи тулбара через i18n', () => {
  it('без провайдера: английский (контракт Chakra-скина)', async () => {
    renderField()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument()
  })

  it('locale="ru": русский, как у shadcn', async () => {
    renderField({ locale: 'ru' })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Полужирный' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Курсив' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отменить' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
  })

  it('t приложения переопределяет словарь по ключу', async () => {
    const t = (key: string) => (key === 'formToolbar.bold' ? 'Жирный текст' : key)
    renderField({ locale: 'ru', t })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Жирный текст' })).toBeInTheDocument()
    })
  })
})
