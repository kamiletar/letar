import type { UIKitErrorFallbackProps } from '@letar/forms-core/uikit'
import { h, type VNode } from 'vue'

export function ErrorFallback({ fieldName, message }: UIKitErrorFallbackProps): VNode {
  return h(
    'div',
    { 'data-slot': 'field-error-fallback', class: 'border-destructive bg-destructive/10 rounded-md border p-3' },
    h('p', { class: 'text-destructive text-sm' }, `Ошибка в поле "${fieldName}": ${message ?? ''}`),
  )
}
