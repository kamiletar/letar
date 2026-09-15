import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { z } from 'zod/v4'
import { Form } from '../../'
import { FieldAuto } from './field-auto'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldAuto', () => {
  it('прокидывает произвольный проп (onComplete) сквозь meta.ui.fieldType в renderFieldByType', async () => {
    const onComplete = vi.fn()

    const schema = z.object({
      code: z.string().meta({ ui: { fieldType: 'pinInput' } }),
    })

    render(
      <TestWrapper>
        <Form schema={schema} initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <FieldAuto name="code" onComplete={onComplete} config={{ useTextareaForLongStrings: false }} />
        </Form>
      </TestWrapper>,
    )

    const inputs = await screen.findAllByRole('textbox')
    expect(inputs.length).toBeGreaterThan(0)

    const user = userEvent.setup()
    for (const input of inputs) {
      await user.type(input, '1')
    }

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })
})
