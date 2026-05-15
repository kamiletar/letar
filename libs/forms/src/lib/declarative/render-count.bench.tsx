'use client'

/**
 * Бенчмарк ре-рендеров @letar/forms.
 *
 * Измеряет количество ре-рендеров при вводе текста в форму из N полей.
 * Доказывает, что TanStack Form рендерит только изменённое поле,
 * а не всю форму (в отличие от controlled-подхода).
 *
 * Запуск: vitest bench src/lib/declarative/render-count.bench.tsx
 */

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react'
import { afterEach, bench, describe } from 'vitest'

import { Form } from './'

// --- Утилиты ---

/** Обёртка Chakra для тестов */
function TestWrapper({ children }: { children: ReactNode }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
}

/** Счётчик рендеров через React.Profiler */
function createRenderTracker() {
  const counts = new Map<string, number>()

  const onRender: ProfilerOnRenderCallback = (id) => {
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  return {
    counts,
    onRender,
    /** Общее число рендеров для данного id */
    getRenderCount: (id: string) => counts.get(id) ?? 0,
    /** Общее число рендеров всех отслеживаемых компонентов */
    getTotalRenders: () => [...counts.values()].reduce((sum, c) => sum + c, 0),
    /** Сброс счётчиков */
    reset: () => counts.clear(),
    /** Обёртка-компонент для отслеживания рендеров */
    Track: ({ id, children }: { id: string; children: ReactNode }) => (
      <Profiler id={id} onRender={onRender}>
        {children}
      </Profiler>
    ),
  }
}

/** Генерирует массив имён полей: field_0, field_1, ... */
function generateFieldNames(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `field_${i}`)
}

/** Генерирует initialValue для формы */
function generateInitialValue(fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, '']))
}

// --- Бенчмарки ---

afterEach(() => {
  cleanup()
})

describe('Ре-рендеры: форма из 10 полей', () => {
  const fields = generateFieldNames(10)
  const initialValue = generateInitialValue(fields)

  bench('ввод 10 символов в первое поле', async () => {
    const tracker = createRenderTracker()
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={initialValue} onSubmit={async () => {}}>
          {fields.map((name) => (
            <tracker.Track key={name} id={name}>
              <Form.Field.String name={name} label={name} />
            </tracker.Track>
          ))}
        </Form>
      </TestWrapper>
    )

    const input = screen.getAllByRole('textbox')[0]

    await act(async () => {
      await user.type(input, 'benchmarks!')
    })
  })
})

describe('Ре-рендеры: форма из 20 полей', () => {
  const fields = generateFieldNames(20)
  const initialValue = generateInitialValue(fields)

  bench('ввод 5 символов в первое поле', async () => {
    const tracker = createRenderTracker()
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={initialValue} onSubmit={async () => {}}>
          {fields.map((name) => (
            <tracker.Track key={name} id={name}>
              <Form.Field.String name={name} label={name} />
            </tracker.Track>
          ))}
        </Form>
      </TestWrapper>
    )

    const input = screen.getAllByRole('textbox')[0]

    await act(async () => {
      await user.type(input, 'hello')
    })
  })
})
