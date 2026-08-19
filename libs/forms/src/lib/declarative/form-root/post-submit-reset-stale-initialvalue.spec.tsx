import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Form } from '../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const options = [
  { value: 'A', label: 'Склад A' },
  { value: 'B', label: 'Склад B' },
]

/**
 * Баг (domwellbes, 2026-08-19): formApi.reset(dataToSubmit) после успешного onSubmit снимает
 * isTouched. Если родитель на следующем рендере (после сабмита он обычно рендерится заново —
 * setOptions/setDistanceKm и т.п.) передаёт initialValue как СТАТИЧЕСКИЙ дефолт, а не то, что
 * реально было отправлено — TanStack Form синхронизирует state.values с этим дефолтом, и
 * пользователь визуально теряет только что сделанный выбор.
 * @see /.claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md
 */
describe('post-submit reset() не откатывает поле к устаревшему initialValue', () => {
  function TestForm({ onSubmitted }: { onSubmitted: (v: string) => void }) {
    // Намеренно НЕ мемоизировано и НЕ учитывает отправленные данные — воспроизводит
    // антипаттерн из бага (initialValue как статический дефолт списка).
    const [, forceRerender] = useState(0)

    return (
      <Form
        initialValue={{ warehouseId: 'A' }}
        onSubmit={(data: { warehouseId: string }) => {
          onSubmitted(data.warehouseId)
          // Имитация типичного постсабмит-поведения приложения: несколько setState
          // (setOptions/setDistanceKm/setSelectedTariffId в реальном коде) вызывают
          // повторный рендер родителя со СТАРЫМ статическим initialValue.
          forceRerender((t) => t + 1)
        }}
      >
        <Form.Field.NativeSelect name="warehouseId" label="Склад" options={options} />
        <Form.Button.Submit>Сохранить</Form.Button.Submit>
      </Form>
    )
  }

  it('сохраняет выбранное значение после сабмита, а не откатывает к дефолту', async () => {
    const user = userEvent.setup()
    const submitted: string[] = []

    render(<TestForm onSubmitted={(v) => submitted.push(v)} />, { wrapper: TestWrapper })

    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('A')

    await user.selectOptions(select, 'B')
    expect(select).toHaveValue('B')

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => {
      expect(submitted).toEqual(['B'])
    })

    // Регресс: после reset() + постсабмит-рендера со старым initialValue select не должен
    // откатиться на 'A'.
    await waitFor(() => {
      expect(select).toHaveValue('B')
    })
  })
})
