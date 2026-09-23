import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../'

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// CHIP_TASKS_2026-09-23.md #7 подозревал, что `Steps.Navigation`, обёрнутая в `Flex` (как в
// material-form.tsx domwellbes), сбивает подсчёт `React.Children` и `isLastStep` срабатывает
// раньше времени. Структурный тест — прямая проверка этой гипотезы, не репродукция бага: с той же
// обёрткой навигация по всем 5 шагам идёт штатно, `isLastStep`/`showSubmit` считаются верно,
// преждевременного submit нет. Живой баг #7 (форма материала уходит в submit на шаге 4→5) этим
// тестом не воспроизводится — код-путь, которым он срабатывает, не идентифицирован (см. PLAN.md).
describe('FormSteps — Navigation, обёрнутая в Flex, не ломает подсчёт и переходы шагов', () => {
  it('переходит по всем шагам штатно, submit происходит только на последнем', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <Form initialValue={{ a: '', b: '', c: '', d: '', e: '' }} onSubmit={onSubmit}>
        <Form.Steps>
          <Form.Steps.Indicator />

          <Form.Steps.Step title="Основные данные">
            <Form.Field.String name="a" />
          </Form.Steps.Step>

          <Form.Steps.Step title="Единицы измерения">
            <Form.Field.String name="b" />
          </Form.Steps.Step>

          <Form.Steps.Step title="Цены">
            <Form.Field.String name="c" />
          </Form.Steps.Step>

          <Form.Steps.Step title="Логистика">
            <Form.Field.String name="d" />
          </Form.Steps.Step>

          <Form.Steps.Step title="Публикация">
            <Form.Field.String name="e" />
          </Form.Steps.Step>

          {/* Как в material-form.tsx domwellbes — Navigation обёрнута в Flex, не прямой ребёнок Steps */}
          <Flex>
            <Form.Steps.Navigation prevLabel="Назад" nextLabel="Далее" submitLabel="Создать" />
          </Flex>
        </Form.Steps>
      </Form>,
      { wrapper: TestWrapper },
    )

    // Шаг 1 → 2
    await user.click(screen.getByRole('button', { name: 'Далее' }))
    await waitFor(() => expect(screen.getByText('Единицы измерения')).toBeInTheDocument())
    expect(onSubmit).not.toHaveBeenCalled()

    // Шаг 2 → 3
    await user.click(screen.getByRole('button', { name: 'Далее' }))
    await waitFor(() => expect(screen.getByText('Цены')).toBeInTheDocument())
    expect(onSubmit).not.toHaveBeenCalled()

    // Шаг 3 → 4 ("Логистика")
    await user.click(screen.getByRole('button', { name: 'Далее' }))
    await waitFor(() => expect(screen.getByText('Логистика')).toBeInTheDocument())
    expect(onSubmit).not.toHaveBeenCalled()

    // РЕГРЕСС: клик «Далее» на шаге 4 ("Логистика", предпоследний) должен перевести на шаг 5
    // ("Публикация"), а НЕ отправить форму немедленно.
    expect(screen.getByRole('button', { name: 'Далее' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Далее' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Создать' })).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
