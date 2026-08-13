import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { Check, Eye, EyeOff, X } from 'lucide-vue-next'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

export type PasswordRequirement = 'minLength:8' | 'uppercase' | 'lowercase' | 'number' | 'special'

const DEFAULT_REQUIREMENTS: PasswordRequirement[] = ['minLength:8', 'uppercase', 'lowercase', 'number', 'special']

const REQUIREMENT_LABELS: Record<PasswordRequirement, string> = {
  'minLength:8': 'Минимум 8 символов',
  uppercase: 'Хотя бы одна заглавная буква',
  lowercase: 'Хотя бы одна строчная буква',
  number: 'Хотя бы одна цифра',
  special: 'Хотя бы один спецсимвол (!@#$%^&*)',
}

function checkRequirement(password: string, requirement: PasswordRequirement): boolean {
  switch (requirement) {
    case 'minLength:8':
      return password.length >= 8
    case 'uppercase':
      return /[A-Z]/.test(password)
    case 'lowercase':
      return /[a-z]/.test(password)
    case 'number':
      return /[0-9]/.test(password)
    case 'special':
      return /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    default:
      return false
  }
}

function calculateStrength(password: string, requirements: PasswordRequirement[]): number {
  if (!password) { return 0 }
  const metCount = requirements.filter((req) => checkRequirement(password, req)).length
  return Math.round((metCount / requirements.length) * 100)
}

function getStrengthInfo(strength: number): { label: string; barClass: string; textClass: string } {
  if (strength < 25) { return { label: 'Слабый', barClass: 'bg-red-500', textClass: 'text-red-600' } }
  if (strength < 50) { return { label: 'Средний', barClass: 'bg-orange-500', textClass: 'text-orange-600' } }
  if (strength < 75) { return { label: 'Хороший', barClass: 'bg-yellow-500', textClass: 'text-yellow-600' } }
  return { label: 'Сильный', barClass: 'bg-green-500', textClass: 'text-green-600' }
}

/**
 * Индикатор силы пароля — расчёт по доле выполненных требований, полоса прогресса — свой
 * `<div>` (нет `Progress.Root` в UIKit-контракте). Портирован из
 * `forms-shadcn/field-password-strength.tsx` (логика 1:1).
 */
export const FieldPasswordStrength = defineComponent({
  name: 'FieldPasswordStrength',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    requirements: {
      type: Array as PropType<PasswordRequirement[]>,
      required: false,
      default: () => DEFAULT_REQUIREMENTS,
    },
    showRequirements: { type: Boolean, required: false, default: true },
    defaultVisible: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const visible = ref(props.defaultVisible)

    const renderError = ref<Error | null>(null)
    onErrorCaptured((error) => {
      renderError.value = error instanceof Error ? error : new Error(String(error))
      console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
      return false
    })

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

      return withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const value = (field.state.value as string) ?? ''
        const strength = calculateStrength(value, props.requirements)
        const { label: strengthLabel, barClass, textClass } = getStrengthInfo(strength)

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h('div', { class: 'flex flex-col gap-2' }, [
            h('div', { class: 'relative' }, [
              rekaUIKit.Input({
                type: visible.value ? 'text' : 'password',
                value,
                onChange: (v) => field.handleChange(v),
                onBlur: field.handleBlur,
                placeholder: placeholder ?? 'Введите пароль',
                maxLength: undefined,
                'data-field-name': props.name,
              }),
              h('button', {
                type: 'button',
                tabindex: -1,
                'aria-label': 'Показать/скрыть пароль',
                class: 'text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center',
                onClick: () => (visible.value = !visible.value),
              }, visible.value ? h(EyeOff, { class: 'size-4' }) : h(Eye, { class: 'size-4' })),
            ]),
            value
              ? h('div', {}, [
                h('div', { class: 'mb-1 flex items-center justify-between' }, [
                  h('span', { class: 'text-muted-foreground text-xs' }, 'Надёжность'),
                  h('span', { class: cn('text-xs font-medium', textClass) }, strengthLabel),
                ]),
                h('div', { class: 'bg-muted h-1 w-full overflow-hidden rounded-full' }, [
                  h('div', { class: cn('h-full transition-all', barClass), style: { width: `${strength}%` } }),
                ]),
              ])
              : null,
            props.showRequirements && value
              ? h(
                'ul',
                { class: 'flex flex-col gap-1 text-sm' },
                props.requirements.map((req) => {
                  const met = checkRequirement(value, req)
                  return h('li', { key: req, class: 'flex items-center gap-2' }, [
                    met
                      ? h(Check, { class: 'size-3.5 text-green-500' })
                      : h(X, { class: 'size-3.5 text-muted-foreground' }),
                    h('span', { class: met ? 'text-foreground' : 'text-muted-foreground' }, REQUIREMENT_LABELS[req]),
                  ])
                }),
              )
              : null,
          ]),
        })
      })
    }
  },
})
