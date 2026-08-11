import type { UIKitFieldErrorProps } from '@letar/forms-core/uikit'
import { h } from 'vue'
import type { UINode } from '../ui-node'

export function FieldError({ hasError, errorMessage, helperText }: UIKitFieldErrorProps<UINode>): UINode {
  if (hasError && errorMessage) {
    return h('p', { 'data-slot': 'field-error', role: 'alert', class: 'text-destructive text-sm' }, errorMessage)
  }
  if (helperText) {
    return h('p', { 'data-slot': 'field-helper', class: 'text-muted-foreground text-sm' }, helperText)
  }
  return null
}
