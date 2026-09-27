import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { AppForm } from '../core/app-form'
import { useAppFormContext } from '../core/form-context'
import { FieldSelect, type FieldSelectOption } from './field-select'

/** Промис с отдельно доступным `resolve` — для проверки состояния `pending` между вызовом и ответом сервера */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

// `computePosition` (`@floating-ui/dom`) резолвится микротаской — один лишний тик, тот же приём,
// что и в `field-select.spec.ts`/`use-listbox-popup.spec.ts`
async function flushPosition() {
  await Promise.resolve()
  await nextTick()
}

async function openPopup(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('[role="combobox"]').trigger('click')
  await flushPosition()
}

function findOptionByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('[role="option"]').find((el) => el.text().includes(text))
}

function editButtons(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('[data-part="edit-button"]')
}

/** Карандаш пункта списка (внутри `[role="option"]`) */
function itemEditButtons(wrapper: ReturnType<typeof mount>) {
  return editButtons(wrapper).filter((el) => el.element.closest('[role="option"]'))
}

/** Карандаш выбранного значения — сосед триггера, не внутри `[role="listbox"]` */
function valueEditButton(wrapper: ReturnType<typeof mount>) {
  return editButtons(wrapper).find((el) => !el.element.closest('[role="listbox"]'))
}

/** Монтирует `FieldSelect` внутри `AppForm`, отдавая наружу инстанс `@tanstack/vue-form` через зонд-компонент рядом в слоте */
function mountSelect(
  schema: z.ZodObject<{ value: z.ZodOptional<z.ZodString> }>,
  options: FieldSelectOption[],
  extraProps: Record<string, unknown>,
  initial = '',
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form, тот же приём, что React `TestForm`
  let form: any
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            { schema, initialValue: { value: initial }, onSubmit: () => undefined },
            {
              default: () => [
                h(FieldSelect, { name: 'value', options, placeholder: 'Выберите', ...extraProps }),
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
  )
  return { wrapper, values: () => form.state.values as { value: string } }
}

const createSchema = z.object({ value: z.string().optional() })
const createOptions: FieldSelectOption[] = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
]

const editSchema = z.object({ value: z.string().optional() })
const editOptions: FieldSelectOption[] = [
  { value: 'a', label: 'Кровля' },
  { value: 'b', label: 'Фасад' },
  { value: 's', label: 'Системная', editable: false },
]

/**
 * Этап 3e паритета Select: `onCreate`/`onUpdate`/`pending` через `useSelectionActionsState`
 * (готовый композабл, бизнес-логика не меняется — только её UI-подключение в headless-разметке).
 * Зеркалит `libs/forms-vue-shadcn/src/lib/fields/field-select-actions.spec.ts`, адаптированный под
 * разметку этого пакета (`[role="combobox"]`/`[role="listbox"]`/`[role="option"]`, не Reka) — без
 * `searchable`/`dependsOn` (Stage 3f, вне объёма).
 */
describe('FieldSelect (forms-vue, headless) — onCreate', () => {
  it('без onCreate пункта «+ Добавить…» нет', async () => {
    const { wrapper } = mountSelect(createSchema, createOptions, {})
    await openPopup(wrapper)
    expect(findOptionByText(wrapper, 'Добавить')).toBeUndefined()
  })

  it('с onCreate в конце списка есть «+ Добавить…»', async () => {
    const { wrapper } = mountSelect(createSchema, createOptions, { onCreate: vi.fn() })
    await openPopup(wrapper)
    expect(findOptionByText(wrapper, '+ Добавить…')).toBeDefined()
  })

  it('выбор пункта вызывает onCreate, созданная опция выбирается', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Solid', value: 'solid' })
    const { wrapper, values } = mountSelect(createSchema, createOptions, { onCreate })
    await openPopup(wrapper)
    await findOptionByText(wrapper, '+ Добавить…')!.trigger('click')
    await flushPromises()
    await nextTick()

    expect(onCreate).toHaveBeenCalledWith('', expect.anything())
    expect(values().value).toBe('solid')
  })

  it('onCreate вернул null — значение не меняется', async () => {
    const onCreate = vi.fn().mockResolvedValue(null)
    const { wrapper, values } = mountSelect(createSchema, createOptions, { onCreate }, 'react')
    await openPopup(wrapper)
    await findOptionByText(wrapper, '+ Добавить…')!.trigger('click')
    await flushPromises()
    await nextTick()

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(values().value).toBe('react')
  })

  it('createItem: false прячет служебный пункт, даже если onCreate задан', async () => {
    const { wrapper } = mountSelect(createSchema, createOptions, { onCreate: vi.fn(), createItem: false })
    await openPopup(wrapper)
    expect(findOptionByText(wrapper, 'Добавить')).toBeUndefined()
  })
})

describe('FieldSelect (forms-vue, headless) — onUpdate', () => {
  it('без onUpdate карандашей нет', async () => {
    const { wrapper } = mountSelect(editSchema, editOptions, {}, 'a')
    await openPopup(wrapper)
    expect(editButtons(wrapper)).toHaveLength(0)
  })

  it('карандаш у каждой редактируемой опции; editable:false скрывает', async () => {
    const { wrapper } = mountSelect(editSchema, editOptions, { onUpdate: vi.fn() }, 'a')
    await openPopup(wrapper)
    // Кровля, Фасад — редактируемы; Системная — editable:false, карандаша нет
    expect(itemEditButtons(wrapper)).toHaveLength(2)
  })

  it('в пункте карандаш вне Tab-порядка и скрыт от AT', async () => {
    const { wrapper } = mountSelect(editSchema, editOptions, { onUpdate: vi.fn() }, 'a')
    await openPopup(wrapper)
    const pencil = itemEditButtons(wrapper)[0]!
    expect(pencil.attributes('tabindex')).toBe('-1')
    expect(pencil.attributes('aria-hidden')).toBe('true')
  })

  it('карандаш у значения — сосед триггера, список закрыт', () => {
    const { wrapper } = mountSelect(editSchema, editOptions, { onUpdate: vi.fn() }, 'a')
    const pencil = valueEditButton(wrapper)
    expect(pencil).toBeDefined()
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('у системной опции (editable:false) карандаша у значения нет', () => {
    const { wrapper } = mountSelect(editSchema, editOptions, { onUpdate: vi.fn() }, 's')
    expect(valueEditButton(wrapper)).toBeUndefined()
  })

  it('клик по карандашу пункта вызывает onUpdate с опцией и не выбирает пункт', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    const { wrapper, values } = mountSelect(editSchema, editOptions, { onUpdate }, 'a')
    await openPopup(wrapper)
    // Порядок карандашей — как опций (Кровля, Фасад): берём Фасад (индекс 1), чтобы клик по
    // чужому пункту доказательно не выбрал его — `values().value` ниже должен остаться 'a'
    const pencil = itemEditButtons(wrapper)[1]!
    await pencil.trigger('click')
    await flushPromises()

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ label: 'Фасад', value: 'b' }), expect.anything())
    expect(values().value).toBe('a')
  })

  it('тот же value: подпись обновляется, форма не dirty (значение поля не меняется)', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля (новая)', value: 'a' })
    const { wrapper, values } = mountSelect(editSchema, editOptions, { onUpdate }, 'a')
    await valueEditButton(wrapper)!.trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.get('[role="combobox"]').text()).toBe('Кровля (новая)')
    expect(values().value).toBe('a')
  })

  it('другой value: выбранное значение заменяется на новое', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля v2', value: 'a2' })
    const { wrapper, values } = mountSelect(editSchema, editOptions, { onUpdate }, 'a')
    await valueEditButton(wrapper)!.trigger('click')
    await flushPromises()
    await nextTick()

    expect(values().value).toBe('a2')
    expect(wrapper.get('[role="combobox"]').text()).toBe('Кровля v2')
  })

  it('карандаш выключен, пока onUpdate ждёт ответа; повторный клик игнорируется; после ответа снова активен', async () => {
    const pending = deferred<null>()
    const onUpdate = vi.fn().mockReturnValue(pending.promise)
    const { wrapper } = mountSelect(editSchema, editOptions, { onUpdate }, 'a')

    await valueEditButton(wrapper)!.trigger('click')
    await flushPromises()
    expect((valueEditButton(wrapper)!.element as HTMLButtonElement).disabled).toBe(true)

    // Повторный клик при pending — второго вызова onUpdate не будет (composable сам игнорирует)
    await valueEditButton(wrapper)!.trigger('click')
    await flushPromises()
    expect(onUpdate).toHaveBeenCalledTimes(1)

    pending.resolve(null)
    await flushPromises()
    await nextTick()
    expect((valueEditButton(wrapper)!.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('свой renderOption с Field.Select.EditButton — карандаш встроен в свою разметку', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    const { wrapper } = mountSelect(editSchema, editOptions, {
      onUpdate,
      renderOption: (option: FieldSelectOption) =>
        h('span', { 'data-testid': 'custom-row' }, [option.label, h(FieldSelect.EditButton)]),
    }, 'a')
    await openPopup(wrapper)

    const rows = wrapper.findAll('[data-testid="custom-row"]')
    expect(rows).toHaveLength(3)
    // Только Кровля/Фасад редактируемы — карандаш внутри кастомного renderOption только у них
    expect(itemEditButtons(wrapper)).toHaveLength(2)
  })
})

describe('FieldSelect (forms-vue, headless) — оптимистичный режим и отказ', () => {
  type Ctx = { optimistic: (p: { label: string }) => void }
  type Created = { label: string; value: string } | null

  const optimisticCreate = (server: ReturnType<typeof deferred<Created>>) =>
    vi.fn(async (_search: string, ctx: Ctx) => {
      ctx.optimistic({ label: 'Solid' })
      return server.promise
    })

  it('подпись новой записи в триггере сразу, значение формы прежнее; после ответа — настоящее', async () => {
    const server = deferred<Created>()
    const { wrapper, values } = mountSelect(createSchema, createOptions, { onCreate: optimisticCreate(server) })
    await openPopup(wrapper)
    await findOptionByText(wrapper, '+ Добавить…')!.trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.get('[role="combobox"]').text()).toBe('Solid')
    expect(values().value).toBe('')

    server.resolve({ label: 'Solid', value: 'solid' })
    await flushPromises()
    await nextTick()

    expect(values().value).toBe('solid')
    expect(wrapper.get('[role="combobox"]').text()).toBe('Solid')
  })

  it('отказ — откат к прежнему значению и встроенное сообщение', async () => {
    const server = deferred<Created>()
    const { wrapper, values } = mountSelect(
      createSchema,
      createOptions,
      { onCreate: optimisticCreate(server) },
      'react',
    )
    await openPopup(wrapper)
    await findOptionByText(wrapper, '+ Добавить…')!.trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[role="combobox"]').text()).toBe('Solid')

    server.resolve(null)
    await flushPromises()
    await nextTick()

    const message = wrapper.find('[data-settle-error]')
    expect(message.exists()).toBe(true)
    expect(message.text()).toContain('Не удалось сохранить «Solid»')
    expect(wrapper.get('[role="combobox"]').text()).toBe('React')
    expect(values().value).toBe('react')
  })

  it('с onSettleError встроенного сообщения нет, причина передана приложению', async () => {
    const server = deferred<Created>()
    const onSettleError = vi.fn()
    const { wrapper } = mountSelect(createSchema, createOptions, {
      onCreate: optimisticCreate(server),
      onSettleError,
    })
    await openPopup(wrapper)
    await findOptionByText(wrapper, '+ Добавить…')!.trigger('click')
    await flushPromises()

    server.resolve(null)
    await flushPromises()
    await nextTick()

    expect(onSettleError).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'create',
        reason: 'declined',
        preview: expect.objectContaining({ label: 'Solid' }),
      }),
    )
    expect(wrapper.find('[data-settle-error]').exists()).toBe(false)
  })

  it('pending-опция приложения приглушена (aria-busy/data-pending), не выбирается', async () => {
    const { wrapper, values } = mountSelect(
      createSchema,
      [{ value: 'react', label: 'React' }, { value: 'tmp', label: 'Новая', pending: true }],
      {},
      'react',
    )
    await openPopup(wrapper)
    const pendingItem = findOptionByText(wrapper, 'Новая')!
    expect(pendingItem.attributes('aria-busy')).toBe('true')
    expect(pendingItem.attributes('data-pending')).toBe('true')

    await pendingItem.trigger('click')
    await nextTick()
    expect(values().value).toBe('react')
  })
})
