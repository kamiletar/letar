import { defineComponent, h, type PropType, ref } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

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

function getStrengthLabel(strength: number): string {
  if (strength < 25) { return 'Слабый' }
  if (strength < 50) { return 'Средний' }
  if (strength < 75) { return 'Хороший' }
  return 'Сильный'
}

/**
 * Индикатор силы пароля — расчёт по доле выполненных требований, чеклист требований под полем.
 * Портирован из `forms-shadcn/field-password-strength.tsx` (логика 1:1).
 */
export const FieldPasswordStrength = defineComponent({
  name: 'FieldPasswordStrength',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
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

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const value = (field.state.value as string) ?? ''
        const strength = calculateStrength(value, props.requirements)
        const strengthLabel = getStrengthLabel(strength)

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h('div', { class: 'letar-field__password-strength' }, [
            h('input', {
              class: 'letar-field__control',
              type: visible.value ? 'text' : 'password',
              value,
              placeholder: placeholder ?? 'Введите пароль',
              'data-field-name': props.name,
              onInput: (e: Event) => field.handleChange((e.target as HTMLInputElement).value),
              onBlur: field.handleBlur,
            }),
            h('button', {
              type: 'button',
              'aria-label': 'Показать/скрыть пароль',
              class: 'letar-field__password-toggle',
              onClick: () => (visible.value = !visible.value),
            }, visible.value ? 'Скрыть' : 'Показать'),
            value
              ? h('div', { class: 'letar-field__password-meter' }, [
                h('span', { class: 'letar-field__password-meter-label' }, `Надёжность: ${strengthLabel}`),
                h('div', { class: 'letar-field__password-meter-bar' }, [
                  h('div', { class: 'letar-field__password-meter-fill', style: { width: `${strength}%` } }),
                ]),
              ])
              : null,
            props.showRequirements && value
              ? h(
                'ul',
                { class: 'letar-field__password-requirements' },
                props.requirements.map((req) => {
                  const met = checkRequirement(value, req)
                  return h('li', {
                    key: req,
                    'data-met': met || undefined,
                    class: 'letar-field__password-requirement',
                  }, `${met ? '✓' : '✗'} ${REQUIREMENT_LABELS[req]}`)
                }),
              )
              : null,
          ]),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
