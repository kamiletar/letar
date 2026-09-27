import { AppForm } from '@letar/forms-vue/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
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

const schema = z.object({ city: z.string().optional() })

function mountCombobox(extraProps: Record<string, unknown>, initial = '') {
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            { schema, initialValue: { city: initial }, onSubmit: () => undefined },
            {
              default: () => [
                h(FieldCombobox, {
                  name: 'city',
                  getLabel: (item: City) => item.name,
                  getValue: (item: City) => item.id,
                  ...extraProps,
                }),
              ],
            },
          )
      },
    }),
    { attachTo: document.body },
  )
}

/** Открывает список стрелкой вниз — как в `field-combobox-render.spec.ts` (Stage 4a) */
async function openList(wrapper: ReturnType<typeof mountCombobox>): Promise<void> {
  await wrapper.find('[data-field-name="city"]').trigger('keydown', { key: 'ArrowDown' })
  await flushPromises()
}

async function typeSearch(wrapper: ReturnType<typeof mountCombobox>, text: string): Promise<void> {
  const input = wrapper.find('[data-field-name="city"]')
  await input.setValue(text)
  await flushPromises()
}

function optionTexts(): string[] {
  return Array.from(document.querySelectorAll('[data-slot="combobox-item"]')).map((el) => el.textContent ?? '')
}

describe('forms-vue-shadcn FieldCombobox — loadOptions (Stage 4b)', () => {
  it('без открытия списка запрос не уходит (everOpened = false)', async () => {
    const loadOptions = vi.fn(async () => [])
    mountCombobox({ loadOptions })
    await flushPromises()
    expect(loadOptions).not.toHaveBeenCalled()
  })

  it('открытие списка с пустой строкой запускает запрос сразу (minChars по умолчанию 1, но 0-длина проходит debounce)', async () => {
    const cities: City[] = [{ id: 'msk', name: 'Москва' }, { id: 'spb', name: 'Санкт-Петербург' }]
    const loadOptions = vi.fn(async () => cities)
    const wrapper = mountCombobox({ loadOptions, minChars: 0 })
    await openList(wrapper)
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(loadOptions).toHaveBeenCalledWith('', expect.objectContaining({ deps: {} }))
    expect(optionTexts()).toEqual(['Москва', 'Санкт-Петербург'])
  })

  it('minChars по умолчанию (1) — запрос ждёт первого символа', async () => {
    const loadOptions = vi.fn(async () => [{ id: 'msk', name: 'Москва' }])
    const wrapper = mountCombobox({ loadOptions })
    await openList(wrapper)
    await vi.advanceTimersByTimeAsync(300)
    expect(loadOptions).not.toHaveBeenCalled()

    await typeSearch(wrapper, 'м')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(loadOptions).toHaveBeenCalledWith('м', expect.anything())
  })

  it('ввод дебаунсится — быстрый набор шлёт один запрос с финальной строкой', async () => {
    const loadOptions = vi.fn(async () => [])
    const wrapper = mountCombobox({ loadOptions, minChars: 0 })
    await openList(wrapper)
    await vi.advanceTimersByTimeAsync(300)
    loadOptions.mockClear()

    const input = wrapper.find('[data-field-name="city"]')
    await input.setValue('м')
    await vi.advanceTimersByTimeAsync(150)
    await input.setValue('мо')
    await vi.advanceTimersByTimeAsync(150)
    await input.setValue('моск')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(loadOptions).toHaveBeenCalledTimes(1)
    expect(loadOptions).toHaveBeenCalledWith('моск', expect.anything())
  })

  it('ошибка загрузки — сообщение и кнопка «Повторить», повтор шлёт запрос заново', async () => {
    const loadOptions = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([{ id: 'msk', name: 'Москва' }])
    const onLoadError = vi.fn()
    const wrapper = mountCombobox({ loadOptions, minChars: 0, onLoadError })
    await openList(wrapper)
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(onLoadError).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).toContain('Не удалось загрузить')
    const retryButton = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Повторить')
    expect(retryButton).toBeTruthy()

    retryButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(loadOptions).toHaveBeenCalledTimes(2)
    await vi.waitFor(() => expect(optionTexts()).toEqual(['Москва']))
  })

  it('без loadOptions и без options — предупреждение в консоль', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mountCombobox({ getLabel: undefined, getValue: undefined })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('нужен ровно один источник опций'))
    spy.mockRestore()
  })
})

describe('forms-vue-shadcn FieldCombobox — loadSelected (Stage 4b)', () => {
  it('значение выбрано, но не в текущей выдаче loadOptions — loadSelected догружает подпись', async () => {
    const loadOptions = vi.fn(async () => [{ id: 'spb', name: 'Санкт-Петербург' }])
    const loadSelected = vi.fn(async (value: string) => ({ id: value, name: 'Казань (не первая страница)' }))
    const wrapper = mountCombobox({ loadOptions, loadSelected, minChars: 0 }, 'kzn')
    await flushPromises()
    await vi.waitFor(() => expect(loadSelected).toHaveBeenCalledWith('kzn', expect.objectContaining({ deps: {} })))
    await flushPromises()

    const input = wrapper.find('[data-field-name="city"]').element as HTMLInputElement
    expect(input.value).toBe('Казань (не первая страница)')
  })

  it('loadOptions заполнил выдачу первым — запоздавший (уже неактуальный) ответ loadSelected не перебивает подпись', async () => {
    // На старте, пока loadOptions ещё не ответил, значения нет в (пустой) выдаче — `useSelectedLoader`
    // транзитно стартует и должен отмениться (по токену, `activeToken`), как только придёт ответ
    // `loadOptions` и `valueInResults` станет true. Управляем обоими промисами вручную, чтобы порядок
    // разрешения был детерминирован — иначе race между двумя `async () => {...}` без контроля порядка
    let resolveOptions: (value: City[]) => void = () => undefined
    let resolveSelected: (value: City) => void = () => undefined
    const loadOptions = vi.fn(() => new Promise<City[]>((resolve) => (resolveOptions = resolve)))
    const loadSelected = vi.fn(() => new Promise<City>((resolve) => (resolveSelected = resolve)))
    const wrapper = mountCombobox({ loadOptions, loadSelected, minChars: 0 }, 'kzn')
    await openList(wrapper)
    await vi.advanceTimersByTimeAsync(300)

    // loadOptions отвечает первым — kzn теперь в выдаче, loadSelected должен считаться отменённым
    resolveOptions([{ id: 'kzn', name: 'Казань' }])
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Запоздавший ответ уже отменённого loadSelected не должен перезаписать подпись
    resolveSelected({ id: 'kzn', name: 'Казань (устаревшая подпись)' })
    await flushPromises()

    const input = wrapper.find('[data-field-name="city"]').element as HTMLInputElement
    expect(input.value).toBe('Казань')
  })

  it('пустое значение поля — loadSelected не вызывается', async () => {
    const loadSelected = vi.fn(async () => ({ id: '1', name: 'x' }))
    mountCombobox({ loadOptions: vi.fn(async () => []), loadSelected, minChars: 0 })
    await flushPromises()
    expect(loadSelected).not.toHaveBeenCalled()
  })

  it('запись из loadSelected не появляется в самом списке', async () => {
    const loadOptions = vi.fn(async () => [{ id: 'spb', name: 'Санкт-Петербург' }])
    const loadSelected = vi.fn(async (value: string) => ({ id: value, name: 'Казань' }))
    const wrapper = mountCombobox({ loadOptions, loadSelected, minChars: 0 }, 'kzn')
    await openList(wrapper)
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    await vi.waitFor(() => expect(optionTexts()).toEqual(['Санкт-Петербург']))
  })
})
