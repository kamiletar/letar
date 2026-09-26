import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createForm } from './create-form'
import { resolveDirtyGuardConfig } from './dirty-guard'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const Wrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('resolveDirtyGuardConfig', () => {
  it('без настроек — выключено', () => {
    expect(resolveDirtyGuardConfig(undefined, undefined)).toBeNull()
  })

  it('опция инстанса true — включено с текстами по умолчанию', () => {
    expect(resolveDirtyGuardConfig(true, undefined)).toEqual({})
  })

  it('проп формы false перебивает включённый инстанс', () => {
    expect(resolveDirtyGuardConfig(true, false)).toBeNull()
    expect(resolveDirtyGuardConfig({ dialogTitle: 'A' }, false)).toBeNull()
  })

  it('проп формы true включает при выключенном инстансе', () => {
    expect(resolveDirtyGuardConfig(false, true)).toEqual({})
    expect(resolveDirtyGuardConfig(undefined, true)).toEqual({})
  })

  it('true на форме оставляет тексты инстанса', () => {
    expect(resolveDirtyGuardConfig({ dialogTitle: 'A' }, true)).toEqual({ dialogTitle: 'A' })
  })

  it('undefined в объекте формы не затирает текст инстанса', () => {
    expect(resolveDirtyGuardConfig({ dialogTitle: 'A' }, { dialogTitle: undefined, cancelText: 'C' })).toEqual({
      dialogTitle: 'A',
      cancelText: 'C',
    })
  })

  it('объект на форме дополняет объект инстанса, тексты формы важнее', () => {
    expect(resolveDirtyGuardConfig({ dialogTitle: 'A', cancelText: 'C' }, { dialogTitle: 'B' })).toEqual({
      dialogTitle: 'B',
      cancelText: 'C',
    })
  })
})

describe('автоматический dirtyGuard в форме', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const ON = createForm({ dirtyGuard: true })
  const OFF = createForm()

  async function makeDirtyAndClickLink() {
    await userEvent.type(screen.getByRole('textbox'), 'x')
    await userEvent.click(screen.getByText('Ссылка'))
  }

  it('по умолчанию (инстанс без опции) защиты нет', async () => {
    render(
      <OFF initialValue={{ title: '' }} onSubmit={() => undefined}>
        <OFF.Field.String name="title" />
        <a href="/other">Ссылка</a>
      </OFF>,
      { wrapper: Wrapper },
    )

    await makeDirtyAndClickLink()

    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('опция инстанса включает защиту: грязная форма + клик по ссылке → одно окно', async () => {
    render(
      <ON initialValue={{ title: '' }} onSubmit={() => undefined}>
        <ON.Field.String name="title" />
        <a href="/other">Ссылка</a>
      </ON>,
      { wrapper: Wrapper },
    )

    await makeDirtyAndClickLink()

    expect(await screen.findAllByText('Unsaved changes')).toHaveLength(1)
  })

  it('чистая форма не блокирует уход', async () => {
    render(
      <ON initialValue={{ title: '' }} onSubmit={() => undefined}>
        <ON.Field.String name="title" />
        <a href="/other">Ссылка</a>
      </ON>,
      { wrapper: Wrapper },
    )

    await userEvent.click(screen.getByText('Ссылка'))

    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('dirtyGuard={false} на форме выключает защиту инстанса', async () => {
    render(
      <ON initialValue={{ title: '' }} onSubmit={() => undefined} dirtyGuard={false}>
        <ON.Field.String name="title" />
        <a href="/other">Ссылка</a>
      </ON>,
      { wrapper: Wrapper },
    )

    await makeDirtyAndClickLink()

    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('dirtyGuard на форме включает защиту при выключенном инстансе', async () => {
    render(
      <OFF initialValue={{ title: '' }} onSubmit={() => undefined} dirtyGuard>
        <OFF.Field.String name="title" />
        <a href="/other">Ссылка</a>
      </OFF>,
      { wrapper: Wrapper },
    )

    await makeDirtyAndClickLink()

    expect(await screen.findAllByText('Unsaved changes')).toHaveLength(1)
  })

  it('тексты из опции инстанса попадают в окно', async () => {
    const Custom = createForm({ dirtyGuard: { dialogTitle: 'Уйти со страницы?', confirmText: 'Да' } })
    render(
      <Custom initialValue={{ title: '' }} onSubmit={() => undefined}>
        <Custom.Field.String name="title" />
        <a href="/other">Ссылка</a>
      </Custom>,
      { wrapper: Wrapper },
    )

    await makeDirtyAndClickLink()

    expect(await screen.findByText('Уйти со страницы?')).toBeInTheDocument()
    expect(screen.getByText('Да')).toBeInTheDocument()
  })

  it('ручной <Form.DirtyGuard /> при включённой автозащите не даёт дубля окна и beforeunload', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    render(
      <ON initialValue={{ title: '' }} onSubmit={() => undefined}>
        <ON.DirtyGuard dialogTitle="Ручной" />
        <ON.Field.String name="title" />
        <a href="/other">Ссылка</a>
      </ON>,
      { wrapper: Wrapper },
    )

    await makeDirtyAndClickLink()

    // Одно окно, и оно — ручного guard (его тексты)
    expect(await screen.findAllByText('Ручной')).toHaveLength(1)
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
    // Активный beforeunload-слушатель один: автоматический отключён (enabled=false не вешает его)
    const added = addSpy.mock.calls.filter(([type]) => type === 'beforeunload').length
    const removed = removeSpy.mock.calls.filter(([type]) => type === 'beforeunload').length
    expect(added - removed).toBe(1)
  })

  it('dirtyGuard={false} не отключает вручную поставленный <Form.DirtyGuard />', async () => {
    render(
      <ON initialValue={{ title: '' }} onSubmit={() => undefined} dirtyGuard={false}>
        <ON.DirtyGuard />
        <ON.Field.String name="title" />
        <a href="/other">Ссылка</a>
      </ON>,
      { wrapper: Wrapper },
    )

    await makeDirtyAndClickLink()

    expect(await screen.findAllByText('Unsaved changes')).toHaveLength(1)
  })

  it('после размонтирования ручного guard автозащита снова активна', async () => {
    const { rerender } = render(
      <ON initialValue={{ title: '' }} onSubmit={() => undefined}>
        <ON.DirtyGuard dialogTitle="Ручной" />
        <ON.Field.String name="title" />
        <a href="/other">Ссылка</a>
      </ON>,
      { wrapper: Wrapper },
    )
    rerender(
      <ON initialValue={{ title: '' }} onSubmit={() => undefined}>
        <ON.Field.String name="title" />
        <a href="/other">Ссылка</a>
      </ON>,
    )

    await makeDirtyAndClickLink()

    expect(await screen.findAllByText('Unsaved changes')).toHaveLength(1)
  })
})
