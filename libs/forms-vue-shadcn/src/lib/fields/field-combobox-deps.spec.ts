import { AppForm, useAppFormContext } from '@letar/forms-vue/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, type PropType } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from '../app-form.test-utils'
import { FieldCombobox } from './field-combobox'

interface City {
  id: string
  name: string
}

beforeEach(() => {
  setupRekaPolyfills()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/**
 * Монтирует живое поле-«родитель» через `form.Field`, как `field-select-dependent.spec.ts`: только
 * так срабатывает `listeners.onChange` формы, а с ним и `dependents.handleFieldChange` (сам механизм
 * автоочистки живёт там, не в `useDependentField`).
 */
const Mount = defineComponent({
  name: 'MountParentFields',
  props: { names: { type: Array as PropType<string[]>, required: true } },
  setup(props) {
    const { form } = useAppFormContext()
    return () =>
      props.names.map((name) =>
        h(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `form.Field` — компонент TanStack Form, не в публичных типах
          (form as any).Field,
          { name },
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `field` — `FieldApi` TanStack Form
            default: ({ field }: any) =>
              h('input', {
                'data-testid': `mount-${name}`,
                value: field.state.value ?? '',
                onInput: (event: Event) => field.handleChange((event.target as HTMLInputElement).value),
              }),
          },
        )
      )
  },
})

function fireOn(el: Element, type: string): void {
  el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
}

function editParent(name: string, value: string): void {
  const input = document.querySelector(`[data-testid="mount-${name}"]`) as HTMLInputElement
  input.value = value
  fireOn(input, 'input')
}

const schema = z.object({
  countryId: z.string().optional().meta({ ui: { title: 'Страна' } }),
  cityId: z.string().optional().meta({ ui: { title: 'Город' } }),
})

function mountDependent(
  cityProps: Record<string, unknown>,
  initialValue: Record<string, string> = {},
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
  let form: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `DependentsRegistry`, тип из `@letar/forms-core/uikit`
  let dependents: any
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            {
              schema,
              initialValue: { countryId: '', cityId: '', ...initialValue },
              onSubmit: () => undefined,
            },
            {
              default: () => [
                h(Mount, { names: ['countryId'] }),
                h(FieldCombobox, {
                  name: 'cityId',
                  getLabel: (item: City) => item.name,
                  getValue: (item: City) => item.id,
                  debounce: 0,
                  ...cityProps,
                }),
                h(defineComponent({
                  setup() {
                    const ctx = useAppFormContext()
                    form = ctx.form
                    dependents = ctx.dependents
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
  return { wrapper, values: () => form.state.values as Record<string, string>, dependents: () => dependents }
}

function hint(): HTMLElement | null {
  return document.querySelector('[data-slot="dependent-hint"]')
}

function liveRegion(): HTMLElement | null {
  return document.querySelector('[data-dependent-live]')
}

function cityInput(): HTMLInputElement {
  return document.querySelector('[data-field-name="cityId"]') as HTMLInputElement
}

async function openList(): Promise<void> {
  cityInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
  await flushPromises()
}

/**
 * Этап 4d паритета Combobox: `dependsOn` (§18) — Vue-эквивалент
 * `libs/forms-shadcn/src/lib/fields/field-combobox-dependent.spec.tsx` (React), сценарии те же, что
 * у `field-select-dependent.spec.ts` этого скина (a11y/блокировка/очистка), плюс интеграция с
 * промис-путём (`loadOptions`/`loadSelected` получают `deps`, смена родителя переинициализирует запрос).
 */
describe('forms-vue-shadcn FieldCombobox — dependsOn (Этап 4d)', () => {
  it('без dependsOn — не заблокировано, подсказки и live-области нет, aria-describedby нет', async () => {
    const { wrapper } = mountDependent({ options: [{ value: 'msk', label: 'Москва' }] })
    await flushPromises()
    expect(cityInput().disabled).toBe(false)
    expect(cityInput().getAttribute('aria-describedby')).toBeNull()
    expect(hint()).toBeNull()
    expect(liveRegion()).toBeNull()
    wrapper.unmount()
  })

  it('родитель пуст — поле заблокировано, подсказка «Сначала выберите «Страна»», aria-describedby на неё, loadOptions не вызывается', async () => {
    const loadOptions = vi.fn(async () => [] as City[])
    const { wrapper } = mountDependent({ dependsOn: 'countryId', loadOptions, minChars: 0 })
    await flushPromises()
    const input = cityInput()
    expect(input.disabled).toBe(true)
    const hintEl = hint()
    expect(hintEl?.textContent).toContain('Сначала выберите «Страна»')
    expect(input.getAttribute('aria-describedby')).toBe(hintEl?.id)
    await openList()
    expect(loadOptions).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('placeholderWhenDisabled переопределяет подсказку в самом поле', async () => {
    const { wrapper } = mountDependent({
      dependsOn: 'countryId',
      placeholderWhenDisabled: 'Недоступно',
      options: [{ value: 'msk', label: 'Москва' }],
    })
    await flushPromises()
    expect(cityInput().placeholder).toBe('Недоступно')
    wrapper.unmount()
  })

  it('родитель заполнен — поле доступно, loadOptions получает deps родителя', async () => {
    const loadOptions = vi.fn(async () => [{ id: 'msk', name: 'Москва' }] as City[])
    const { wrapper } = mountDependent(
      { dependsOn: 'countryId', loadOptions, minChars: 0 },
      { countryId: 'ru' },
    )
    await flushPromises()
    expect(cityInput().disabled).toBe(false)
    expect(hint()).toBeNull()
    await openList()
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()
    expect(loadOptions).toHaveBeenCalledWith('', expect.objectContaining({ deps: { countryId: 'ru' } }))
    wrapper.unmount()
  })

  it('реальная правка родителя очищает значение, подпись в поле ввода и объявляет об этом в live-области', async () => {
    const loadSelected = vi.fn(async () => ({ id: 'msk', name: 'Москва' }))
    const { wrapper, values } = mountDependent(
      { dependsOn: 'countryId', loadOptions: async () => [], loadSelected, minChars: 0 },
      { countryId: 'ru', cityId: 'msk' },
    )
    await flushPromises()
    await vi.waitFor(() => expect(cityInput().value).toBe('Москва'))

    editParent('countryId', 'de')
    await flushPromises()

    expect(values().cityId).toBe('')
    await vi.waitFor(() => expect(cityInput().value).toBe(''))
    expect(liveRegion()?.textContent).toContain('Поле «Город» очищено: изменилось поле «Страна»')
    wrapper.unmount()
  })

  it('родитель уже заполнен (initialValue) — очистки нет, loadSelected получает deps родителя', async () => {
    const loadSelected = vi.fn(async () => ({ id: 'msk', name: 'Москва' }))
    const { wrapper, values } = mountDependent(
      { dependsOn: 'countryId', loadOptions: async () => [], loadSelected, minChars: 0 },
      { countryId: 'ru', cityId: 'msk' },
    )
    await flushPromises()
    await vi.waitFor(() =>
      expect(loadSelected).toHaveBeenCalledWith('msk', expect.objectContaining({ deps: { countryId: 'ru' } }))
    )
    expect(values().cityId).toBe('msk')
    expect(liveRegion()?.textContent).toBe('')
    wrapper.unmount()
  })

  it('clearOnParentChange: false — значение остаётся при смене родителя', async () => {
    const { wrapper, values } = mountDependent(
      { dependsOn: 'countryId', clearOnParentChange: false, options: [{ value: 'msk', label: 'Москва' }] },
      { countryId: 'ru', cityId: 'msk' },
    )
    await flushPromises()
    editParent('countryId', 'de')
    await flushPromises()
    expect(values().cityId).toBe('msk')
    wrapper.unmount()
  })

  it('disableWhenParentEmpty: false — поле доступно даже при пустом родителе', async () => {
    const { wrapper } = mountDependent({
      dependsOn: 'countryId',
      disableWhenParentEmpty: false,
      options: [{ value: 'msk', label: 'Москва' }],
    })
    await flushPromises()
    expect(cityInput().disabled).toBe(false)
    expect(hint()).toBeNull()
    wrapper.unmount()
  })

  it('несколько родителей: depsReady требует оба, подсказка перечисляет недостающих', async () => {
    const schemaTwoParents = z.object({
      countryId: z.string().optional().meta({ ui: { title: 'Страна' } }),
      regionId: z.string().optional().meta({ ui: { title: 'Регион' } }),
      cityId: z.string().optional().meta({ ui: { title: 'Город' } }),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
    let form: any
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              AppForm,
              {
                schema: schemaTwoParents,
                initialValue: { countryId: '', regionId: '', cityId: '' },
                onSubmit: () => undefined,
              },
              {
                default: () => [
                  h(Mount, { names: ['countryId', 'regionId'] }),
                  h(FieldCombobox, {
                    name: 'cityId',
                    options: [{ value: 'msk', label: 'Москва' }],
                    dependsOn: ['countryId', 'regionId'],
                    depsReady: (deps: Record<string, unknown>) => !!deps.countryId && !!deps.regionId,
                  }),
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
    await flushPromises()
    expect(hint()?.textContent).toContain('Страна')
    expect(hint()?.textContent).toContain('Регион')

    editParent('countryId', 'ru')
    await flushPromises()
    // Один родитель заполнен, второй ещё нет — поле остаётся заблокированным
    expect(cityInput().disabled).toBe(true)

    editParent('regionId', 'central')
    await flushPromises()
    expect(cityInput().disabled).toBe(false)
    void form
    wrapper.unmount()
  })

  it('dependents.suppress() — правка родителя внутри suppress не чистит зависимое поле', async () => {
    const { wrapper, values, dependents } = mountDependent(
      { dependsOn: 'countryId', options: [{ value: 'msk', label: 'Москва' }] },
      { countryId: 'ru', cityId: 'msk' },
    )
    await flushPromises()

    dependents().suppress(() => {
      editParent('countryId', 'de')
    })
    await flushPromises()

    expect(values().cityId).toBe('msk')
    wrapper.unmount()
  })

  it('смена родителя переинициализирует промис-путь: loadOptions вызывается заново с новыми deps', async () => {
    const loadOptions = vi.fn(async (_search: string, ctx: { deps: Record<string, unknown> }) => [
      { id: 'x', name: `Город ${String(ctx.deps.countryId)}` },
    ])
    const { wrapper } = mountDependent(
      { dependsOn: 'countryId', loadOptions, minChars: 0 },
      { countryId: 'ru' },
    )
    await flushPromises()
    await openList()
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()
    expect(loadOptions).toHaveBeenCalledWith('', expect.objectContaining({ deps: { countryId: 'ru' } }))

    editParent('countryId', 'de')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()
    expect(loadOptions).toHaveBeenCalledWith('', expect.objectContaining({ deps: { countryId: 'de' } }))
    wrapper.unmount()
  })
})
