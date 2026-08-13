import type { CardBrand } from '@letar/forms-core/credit-card'
import {
  detectBrand,
  formatCardNumber,
  formatExpiry,
  isExpiryValid,
  luhn,
  maxFormattedLength,
  stripCardNumber,
} from '@letar/forms-core/credit-card'
import { computed, type Ref, ref, type VNodeRef } from 'vue'
import { useAppFormContext } from './form-context'

/** Статус валидации подполя (номер/срок/CVC). */
export type CreditCardFieldStatus = 'idle' | 'valid' | 'error'

export interface UseCreditCardFieldOptions {
  /** Имя поля (группы) в форме — subfields пишутся как `${name}.number`/`.expiry`/`.cvc`. */
  name: string
  /** Ограничить допустимые бренды. */
  brands?: CardBrand[]
}

export interface UseCreditCardFieldResult {
  numberDisplay: Ref<string>
  expiryDisplay: Ref<string>
  cvcValue: Ref<string>
  numberStatus: Ref<CreditCardFieldStatus>
  expiryStatus: Ref<CreditCardFieldStatus>
  cvcStatus: Ref<CreditCardFieldStatus>
  numberError: Ref<string | undefined>
  expiryError: Ref<string | undefined>
  brand: Ref<ReturnType<typeof detectBrand>>
  cvcHint: Ref<string>
  numberMaxLength: Ref<number>
  /** Функциональный ref — назначить `<input ref={expiryInputRef}>` для автоперехода. */
  expiryInputRef: VNodeRef
  cvcInputRef: VNodeRef
  onNumberInput: (event: Event) => void
  onNumberBlur: () => void
  onExpiryInput: (event: Event) => void
  onExpiryBlur: () => void
  onCvcInput: (event: Event) => void
  onCvcBlur: () => void
}

/**
 * Vue-composable логики `Form.Field.CreditCard` (React `credit-card-field.tsx`,
 * `forms-shadcn/credit-card-field.tsx`) — общий для headless и Reka-скина, только разметка
 * рендерится отдельно в каждом пакете. Форматтеры/валидаторы переиспользуются 1:1 из
 * `@letar/forms-core/credit-card`, как и в обеих React-версиях.
 *
 * Компонент-поле не участвует в Zod-валидации через `withFieldValidation` (это не одиночное
 * schema-поле, а составной виджет с тремя subfields) — пишет напрямую через
 * `form.setFieldValue`, тем же способом, что и React-версии.
 */
export function useCreditCardField(options: UseCreditCardFieldOptions): UseCreditCardFieldResult {
  const { name, brands } = options
  const { form } = useAppFormContext()

  const numberDisplay = ref('')
  const expiryDisplay = ref('')
  const cvcValue = ref('')

  const numberStatus = ref<CreditCardFieldStatus>('idle')
  const expiryStatus = ref<CreditCardFieldStatus>('idle')
  const cvcStatus = ref<CreditCardFieldStatus>('idle')
  const numberError = ref<string | undefined>(undefined)
  const expiryError = ref<string | undefined>(undefined)

  const brand = computed(() => detectBrand(numberDisplay.value))
  const isBrandAllowed = computed(() => !brands || brands.length === 0 || brands.includes(brand.value.brand))
  const cvcHint = computed(() =>
    brand.value.brand === 'amex' ? '4 цифры на лицевой стороне карты' : '3 цифры на обратной стороне карты'
  )
  const numberMaxLength = computed(() => maxFormattedLength(numberDisplay.value))

  let expiryEl: HTMLInputElement | null = null
  let cvcEl: HTMLInputElement | null = null

  return {
    numberDisplay,
    expiryDisplay,
    cvcValue,
    numberStatus,
    expiryStatus,
    cvcStatus,
    numberError,
    expiryError,
    brand,
    cvcHint,
    numberMaxLength,
    expiryInputRef: ((el: Element | null) => {
      expiryEl = el as HTMLInputElement | null
    }) as VNodeRef,
    cvcInputRef: ((el: Element | null) => {
      cvcEl = el as HTMLInputElement | null
    }) as VNodeRef,
    onNumberInput: (event: Event) => {
      const raw = stripCardNumber((event.target as HTMLInputElement).value)
      const formatted = formatCardNumber(raw)
      numberDisplay.value = formatted
      numberStatus.value = 'idle'
      numberError.value = undefined

      form.setFieldValue(`${name}.number`, raw)

      const maxLen = Math.max(...brand.value.lengths)
      if (raw.length >= maxLen) {
        expiryEl?.focus()
      }
    },
    onNumberBlur: () => {
      const raw = stripCardNumber(numberDisplay.value)
      if (!raw) {
        return
      }

      if (raw.length < 12) {
        numberStatus.value = 'error'
        numberError.value = 'Номер слишком короткий'
      } else if (!luhn(raw)) {
        numberStatus.value = 'error'
        numberError.value = 'Некорректный номер карты'
      } else if (!isBrandAllowed.value) {
        numberStatus.value = 'error'
        numberError.value = 'Этот тип карты не поддерживается'
      } else {
        numberStatus.value = 'valid'
        numberError.value = undefined
      }
    },
    onExpiryInput: (event: Event) => {
      let raw = (event.target as HTMLInputElement).value.replace(/\D/g, '')

      if (raw.length === 1 && Number(raw) > 1) {
        raw = `0${raw}`
      }

      const formatted = formatExpiry(raw)
      expiryDisplay.value = formatted
      expiryStatus.value = 'idle'
      expiryError.value = undefined

      form.setFieldValue(`${name}.expiry`, formatted)

      if (formatted.length === 5) {
        cvcEl?.focus()
      }
    },
    onExpiryBlur: () => {
      if (!expiryDisplay.value) {
        return
      }

      if (expiryDisplay.value.length < 5) {
        expiryStatus.value = 'error'
        expiryError.value = 'Введите MM/YY'
      } else if (!isExpiryValid(expiryDisplay.value)) {
        expiryStatus.value = 'error'
        expiryError.value = 'Карта просрочена'
      } else {
        expiryStatus.value = 'valid'
        expiryError.value = undefined
      }
    },
    onCvcInput: (event: Event) => {
      const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, brand.value.cvcLength)
      cvcValue.value = raw
      cvcStatus.value = 'idle'

      form.setFieldValue(`${name}.cvc`, raw)
    },
    onCvcBlur: () => {
      if (!cvcValue.value) {
        return
      }
      cvcStatus.value = cvcValue.value.length < brand.value.cvcLength ? 'error' : 'valid'
    },
  }
}
