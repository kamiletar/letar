import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const options = [
  { label: 'Кровля', value: 'a' },
  { label: 'Привет', value: 'b' },
  { label: 'Roofing', value: 'c' },
]

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

const optionTexts = () => Array.from(document.querySelectorAll('[role="option"]')).map((el) => el.textContent?.trim())

describe('Field.Combobox — поиск с учётом раскладки', () => {
  it('«ghbdtn» находит «Привет», латинская опция — по латинскому запросу', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ cat: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox name="cat" options={options} />
        </Form>
      </TestWrapper>,
    )
    const input = screen.getByRole('combobox')
    await userEvent.click(input)
    fireEvent.change(input, { target: { value: 'ghbdtn' } })
    await waitFor(() => expect(optionTexts()).toEqual(['Привет']))
    fireEvent.change(input, { target: { value: 'roof' } })
    await waitFor(() => expect(optionTexts()).toEqual(['Roofing']))
  })
})
