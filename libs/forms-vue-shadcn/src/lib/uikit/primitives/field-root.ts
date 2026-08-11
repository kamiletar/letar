import type { UIKitFieldRootProps } from '@letar/forms-core/uikit'
import { h, type VNode } from 'vue'
import type { UINode } from '../ui-node'

export function FieldRoot({ invalid, disabled, children }: UIKitFieldRootProps<UINode>): VNode {
  return h(
    'div',
    {
      'data-slot': 'field-root',
      'data-invalid': invalid || undefined,
      'data-disabled': disabled || undefined,
      class: 'space-y-2',
    },
    children ?? undefined,
  )
}
