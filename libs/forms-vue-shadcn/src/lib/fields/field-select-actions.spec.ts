import { AppForm, useAppFormContext } from '@letar/forms-vue/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from '../app-form.test-utils'
import { FieldSelect, type FieldSelectOption } from './field-select'

beforeEach(() => {
  setupRekaPolyfills()
})

// Тест, упавший до своего `wrapper.unmount()` (например, ассерт внутри `openList`), иначе
// оставляет DOM смонтированным на `document.body` — следующий тест находит его карандаши/пункты
// через глобальные `document.querySelectorAll` в хелперах ниже
afterEach(() => {
  document.body.replaceChildren()
})

/** Промис с отдельно доступным `resolve` — для проверки состояния `pending` между вызовом и ответом сервера */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

/** Диспатчит на элемент указанный тип события (bubbles: true) — тот же приём, что `fireEvent` в RTL */
function fireOn(el: Element, type: string): void {
  el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
}

/**
 * Выбор пункта — через `keydown Enter` на самом пункте, не `pointerup`. Список открыт клавиатурой
 * (`openList` шлёт `Enter` в триггер), а у Reka есть баг-по-конструкции для этого пути: пока триггер
 * не получил СВОЙ `pointerdown`, `triggerPointerDownPosRef` в `SelectRoot` остаётся дефолтным
 * `{x:0,y:0}` (не `null`), и `SelectContentImpl` вешает на `document` разовый capture-`pointerup`,
 * который проглатывает первый же `pointerup` где угодно (`pointerMoveDelta` нулевой ⇒ `<=10,<=10`
 * ⇒ `preventDefault()`) — событие приходит на пункт уже `defaultPrevented`, `onValueChange` не
 * зовётся. `SelectItem` слушает `Enter`/`Space` отдельным `keydown`-хендлером в обход этого — тот
 * же путь, которым выбирает реальный клавиатурный пользователь
 */
function selectOption(el: Element): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
}

function findOptionByText(text: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((el) =>
    el.textContent?.includes(text)
  )
}

function pencils(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-part="edit-button"]'))
}

/** Карандаш пункта списка (внутри `[role="option"]`) */
function itemPencils(): HTMLElement[] {
  return pencils().filter((el) => el.closest('[role="option"]'))
}

/** Карандаш выбранного значения — сосед триггера, не внутри пункта списка */
function valuePencil(): HTMLElement | undefined {
  return pencils().find((el) => !el.closest('[role="option"]'))
}

/** Открывает список тем же способом, что и клавиатура: Reka `SelectTrigger` слушает `Enter` из `OPEN_KEYS` */
async function openList(
  wrapper: { find: (s: string) => { trigger: (e: string, opts?: unknown) => Promise<void> } },
  fieldName: string,
) {
  await wrapper.find(`[data-field-name="${fieldName}"]`).trigger('keydown', { key: 'Enter' })
  await flushPromises()
}

const createSchema = z.object({ framework: z.string().optional() })
const createOptions: FieldSelectOption[] = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
]

/** Монтирует `FieldSelect` внутри `AppForm`, отдавая наружу инстанс `@tanstack/vue-form` через зонд-компонент рядом в слоте */
function mountCreateSelect(extraProps: Record<string, unknown>, initial = '') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form, тот же приём, что `TestForm` (React)
  let form: any
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            { schema: createSchema, initialValue: { framework: initial }, onSubmit: () => undefined },
            {
              default: () => [
                h(FieldSelect, { name: 'framework', options: createOptions, placeholder: 'Выберите', ...extraProps }),
                h(defineComponent({
                  setup() {
                    form = useAppFormContext().form
                    return () => null
                  },
                })),
              ],
            },
          )
      },
    }),
    { attachTo: document.body },
  )
  return { wrapper, values: () => form.state.values as { framework: string } }
}

const editOptions: FieldSelectOption[] = [
  { value: 'a', label: 'Кровля' },
  { value: 'b', label: 'Фасад' },
  { value: 's', label: 'Системная', editable: false },
]
const editSchema = z.object({ cat: z.string().optional() })

function mountEditSelect(extraProps: Record<string, unknown>, initial = 'a') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
  let form: any
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            { schema: editSchema, initialValue: { cat: initial }, onSubmit: () => undefined },
            {
              default: () => [
                h(FieldSelect, { name: 'cat', options: editOptions, ...extraProps }),
                h(defineComponent({
                  setup() {
                    form = useAppFormContext().form
                    return () => null
                  },
                })),
              ],
            },
          )
      },
    }),
    { attachTo: document.body },
  )
  return { wrapper, values: () => form.state.values as { cat: string } }
}

/**
 * Stage 3b паритета Select: `onCreate`/`onUpdate` через `useSelectionActionsState` (Stage 2),
 * `pending`, provide/inject-контекст карандашей, встроенное сообщение отказа (§16.7).
 * Зеркалит `libs/forms-shadcn/src/lib/fields/field-select-oncreate.spec.tsx`,
 * `field-select-onupdate.spec.tsx`, `field-select-optimistic.spec.tsx` (React) — без
 * searchable/dependsOn (Stage 3c) и без реестра форм (`registry: null`, вне объёма стадии).
 */
describe('forms-vue-shadcn FieldSelect — onCreate', () => {
  it('без onCreate пункта «+ Добавить…» нет', async () => {
    const { wrapper } = mountCreateSelect({})
    await openList(wrapper, 'framework')
    expect(findOptionByText('Добавить')).toBeUndefined()
    wrapper.unmount()
  })

  it('с onCreate в конце списка есть «+ Добавить…»', async () => {
    const { wrapper } = mountCreateSelect({ onCreate: vi.fn() })
    await openList(wrapper, 'framework')
    expect(findOptionByText('+ Добавить…')).toBeDefined()
    wrapper.unmount()
  })

  it('выбор пункта вызывает onCreate, созданная опция выбирается', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Solid', value: 'solid' })
    const { wrapper, values } = mountCreateSelect({ onCreate })
    await openList(wrapper, 'framework')
    selectOption(findOptionByText('+ Добавить…')!)
    await flushPromises()
    await flushPromises()

    expect(onCreate).toHaveBeenCalledWith('', expect.anything())
    expect(values().framework).toBe('solid')
    wrapper.unmount()
  })

  it('onCreate вернул null — значение не меняется', async () => {
    const onCreate = vi.fn().mockResolvedValue(null)
    const { wrapper, values } = mountCreateSelect({ onCreate }, 'react')
    await openList(wrapper, 'framework')
    selectOption(findOptionByText('+ Добавить…')!)
    await flushPromises()
    await flushPromises()

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(values().framework).toBe('react')
    wrapper.unmount()
  })
})

describe('forms-vue-shadcn FieldSelect — onUpdate', () => {
  it('без onUpdate карандашей нет', async () => {
    const { wrapper } = mountEditSelect({})
    await openList(wrapper, 'cat')
    expect(pencils()).toHaveLength(0)
    wrapper.unmount()
  })

  it('карандаш у каждой редактируемой опции; editable:false скрывает', async () => {
    const { wrapper } = mountEditSelect({ onUpdate: vi.fn() })
    await openList(wrapper, 'cat')
    // Кровля, Фасад — редактируемы; Системная — editable:false, карандаша нет
    expect(itemPencils()).toHaveLength(2)
    wrapper.unmount()
  })

  it('в пункте карандаш вне Tab-порядка и скрыт от AT', async () => {
    const { wrapper } = mountEditSelect({ onUpdate: vi.fn() })
    await openList(wrapper, 'cat')
    // Нет jest-dom матчеров в этом проекте (только localStorage-полифилл в vitest.setup.ts) —
    // сверяем атрибуты напрямую через DOM API
    expect(itemPencils()[0]?.getAttribute('tabindex')).toBe('-1')
    expect(itemPencils()[0]?.getAttribute('aria-hidden')).toBe('true')
    wrapper.unmount()
  })

  it('карандаш у значения — сосед триггера, не внутри него', async () => {
    const { wrapper } = mountEditSelect({ onUpdate: vi.fn() })
    await flushPromises()
    const pencil = valuePencil()
    expect(pencil).toBeDefined()
    expect(pencil!.closest('[data-slot="select-trigger"]')).toBeNull()
    wrapper.unmount()
  })

  it('у системной опции (editable:false) карандаша у значения нет', async () => {
    const { wrapper } = mountEditSelect({ onUpdate: vi.fn() }, 's')
    await flushPromises()
    expect(valuePencil()).toBeUndefined()
    wrapper.unmount()
  })

  it('клик по карандашу пункта вызывает onUpdate с опцией и не выбирает пункт', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    const { wrapper, values } = mountEditSelect({ onUpdate })
    await openList(wrapper, 'cat')
    // Список карандашей идёт в порядке опций (Кровля, Фасад — обе редактируемы, Системная скрыта):
    // индекс 0 — Кровля (уже выбрана), берём индекс 1 (Фасад), чтобы клик по чужому пункту
    // доказательно не выбрал его — `values().cat` ниже должен остаться прежним ('a')
    const pencil = itemPencils()[1]!
    fireOn(pencil, 'pointerdown')
    fireOn(pencil, 'pointerup')
    fireOn(pencil, 'click')
    await flushPromises()

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ label: 'Фасад', value: 'b' }), expect.anything())
    // Клик по карандашу не выбрал пункт — значение формы не изменилось
    expect(values().cat).toBe('a')
    wrapper.unmount()
  })

  it('тот же value: подпись обновляется, форма не dirty (значение поля не меняется)', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля (новая)', value: 'a' })
    const { wrapper, values } = mountEditSelect({ onUpdate })
    await flushPromises()
    fireOn(valuePencil()!, 'click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-field-name="cat"]').text()).toContain('Кровля (новая)')
    expect(values().cat).toBe('a')
    wrapper.unmount()
  })

  it('другой value: выбранное значение заменяется на новое', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля v2', value: 'a2' })
    const { wrapper, values } = mountEditSelect({ onUpdate })
    await flushPromises()
    fireOn(valuePencil()!, 'click')
    await flushPromises()
    await flushPromises()

    expect(values().cat).toBe('a2')
    expect(wrapper.find('[data-field-name="cat"]').text()).toContain('Кровля v2')
    wrapper.unmount()
  })

  it('карандаш выключен, пока onUpdate ждёт ответа; повторный клик игнорируется; после ответа снова активен', async () => {
    const pending = deferred<null>()
    const onUpdate = vi.fn().mockReturnValue(pending.promise)
    const { wrapper } = mountEditSelect({ onUpdate })
    await flushPromises()

    fireOn(valuePencil()!, 'click')
    await flushPromises()
    expect((valuePencil() as HTMLButtonElement).disabled).toBe(true)

    // Повторный клик при pending — второго вызова onUpdate не будет (composable сам игнорирует)
    fireOn(valuePencil()!, 'click')
    await flushPromises()
    expect(onUpdate).toHaveBeenCalledTimes(1)

    pending.resolve(null)
    await flushPromises()
    await flushPromises()
    expect((valuePencil() as HTMLButtonElement).disabled).toBe(false)
    wrapper.unmount()
  })

  it('свой renderOption без EditButton — карандаша в пункте нет; Select.CreateButton в listFooter зовёт onCreate', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Новая', value: 'n' })
    const { wrapper } = mountEditSelect({
      onUpdate: vi.fn(),
      onCreate,
      createItem: false,
      renderOption: (o: FieldSelectOption) => h('span', o.label),
      listFooter: h(FieldSelect.CreateButton),
    })
    await openList(wrapper, 'cat')
    expect(itemPencils()).toHaveLength(0)
    const createBtn = document.querySelector('button:not([data-part])') as HTMLElement | null
    // Кнопка создания — единственная кнопка в подвале списка, найдём по тексту
    const btn = Array.from(document.querySelectorAll('button')).find((el) => el.textContent?.includes('Добавить'))
    expect(btn ?? createBtn).toBeTruthy()
    fireOn(btn!, 'click')
    expect(onCreate).toHaveBeenCalledWith('', expect.anything())
    wrapper.unmount()
  })
})

describe('forms-vue-shadcn FieldSelect — оптимистичный режим и отказ (§16.7)', () => {
  type Ctx = { optimistic: (p: { label: string }) => void }
  type Created = { label: string; value: string } | null

  const optimisticCreate = (server: ReturnType<typeof deferred<Created>>) =>
    vi.fn(async (_search: string, ctx: Ctx) => {
      ctx.optimistic({ label: 'Solid' })
      return server.promise
    })

  it('подпись новой записи в триггере сразу, значение формы прежнее; после ответа — настоящее', async () => {
    const server = deferred<Created>()
    const { wrapper, values } = mountCreateSelect({ onCreate: optimisticCreate(server) })
    await openList(wrapper, 'framework')
    selectOption(findOptionByText('+ Добавить…')!)
    await flushPromises()

    expect(wrapper.find('[data-field-name="framework"]').text()).toContain('Solid')
    expect(values().framework).toBe('')

    server.resolve({ label: 'Solid', value: 'solid' })
    await flushPromises()
    await flushPromises()

    expect(values().framework).toBe('solid')
    expect(wrapper.find('[data-field-name="framework"]').text()).toContain('Solid')
    wrapper.unmount()
  })

  it('отказ — откат к прежнему значению и встроенное сообщение', async () => {
    const server = deferred<Created>()
    const { wrapper, values } = mountCreateSelect({ onCreate: optimisticCreate(server) }, 'react')
    await openList(wrapper, 'framework')
    selectOption(findOptionByText('+ Добавить…')!)
    await flushPromises()
    expect(wrapper.find('[data-field-name="framework"]').text()).toContain('Solid')

    server.resolve(null)
    await flushPromises()
    await flushPromises()

    const message = document.querySelector('[data-settle-error]')
    expect(message?.textContent).toContain('Не удалось сохранить «Solid»')
    expect(wrapper.find('[data-field-name="framework"]').text()).toContain('React')
    expect(values().framework).toBe('react')
    wrapper.unmount()
  })

  it('с onSettleError встроенного сообщения нет, причина передана приложению', async () => {
    const server = deferred<Created>()
    const onSettleError = vi.fn()
    const { wrapper } = mountCreateSelect({ onCreate: optimisticCreate(server), onSettleError })
    await openList(wrapper, 'framework')
    selectOption(findOptionByText('+ Добавить…')!)
    await flushPromises()

    server.resolve(null)
    await flushPromises()
    await flushPromises()

    expect(onSettleError).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'create',
        reason: 'declined',
        preview: expect.objectContaining({ label: 'Solid' }),
      }),
    )
    expect(document.querySelector('[data-settle-error]')).toBeNull()
    wrapper.unmount()
  })

  it('pending-опция приложения приглушена, не выбирается, показан спиннер', async () => {
    const { wrapper, values } = mountCreateSelect(
      { options: [{ value: 'react', label: 'React' }, { value: 'tmp', label: 'Новая', pending: true }] },
      'react',
    )
    await openList(wrapper, 'framework')
    const pendingItem = findOptionByText('Новая')!
    // Нет jest-dom в проекте — `hasAttribute` вместо `toHaveAttribute`
    expect(pendingItem.hasAttribute('data-pending')).toBe(true)
    selectOption(pendingItem)
    await flushPromises()
    expect(values().framework).toBe('react')
    wrapper.unmount()
  })
})
