import { AppForm } from '@letar/forms-vue/core'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from './app-form.test-utils'
import { FieldBirthCertificate } from './fields/field-birth-certificate'
import { FieldDepartmentCode } from './fields/field-department-code'
import { FieldForeignPassport } from './fields/field-foreign-passport'

beforeEach(() => {
  setupRekaPolyfills()
})

const stage8Schema = z.object({
  birthCertificate: z.string().optional().meta({ ui: { title: 'Свидетельство о рождении' } }),
  foreignPassport: z.string().optional().meta({ ui: { title: 'Загранпаспорт' } }),
  departmentCode: z.string().optional().meta({ ui: { title: 'Код подразделения' } }),
})

function Stage8TestForm() {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema: stage8Schema, initialValue: {}, onSubmit: vi.fn() },
          {
            default: () => [
              h(FieldBirthCertificate, { name: 'birthCertificate' }),
              h(FieldForeignPassport, { name: 'foreignPassport' }),
              h(FieldDepartmentCode, { name: 'departmentCode' }),
            ],
          },
        )
    },
  })
}

describe('Этап 8 — недостающие документные поля (BirthCertificate/ForeignPassport/DepartmentCode)', () => {
  it('рендерят контрол для каждого поля', () => {
    const wrapper = mount(Stage8TestForm(), { attachTo: document.body })

    expect(wrapper.find('input[data-field-name="birthCertificate"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="foreignPassport"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="departmentCode"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('FieldBirthCertificate: свободный ввод, нормализация гомоглифов на blur', async () => {
    const wrapper = mount(Stage8TestForm(), { attachTo: document.body })
    const input = wrapper.find('input[data-field-name="birthCertificate"]')

    await input.setValue('|||-МЮ № 123456')
    await input.trigger('blur')
    await nextTick()

    expect((input.element as HTMLInputElement).value).toBe('III-МЮ № 123456')
    wrapper.unmount()
  })

  it('FieldForeignPassport: маска "99 9999999"', async () => {
    const wrapper = mount(Stage8TestForm(), { attachTo: document.body })
    const input = wrapper.find('input[data-field-name="foreignPassport"]')

    await input.setValue('750123456')
    await nextTick()

    expect((input.element as HTMLInputElement).value).toBe('75 0123456')
    wrapper.unmount()
  })

  it('FieldDepartmentCode: маска "999-999" через MaskController', async () => {
    const wrapper = mount(Stage8TestForm(), { attachTo: document.body })
    const input = wrapper.find('input[data-field-name="departmentCode"]')

    await input.setValue('770123')
    await nextTick()

    expect((input.element as HTMLInputElement).value).toBe('770-123')
    wrapper.unmount()
  })
})
