import type { UIKitFieldLabelProps } from '@letar/forms-core/uikit'
import { Label } from 'reka-ui'
import { h } from 'vue'
import type { UINode } from '../ui-node'

export function FieldLabel({ label, required, tooltip }: UIKitFieldLabelProps<UINode>): UINode {
  if (!label) { return null }
  return h(
    Label,
    {
      'data-slot': 'field-label',
      class:
        'flex items-center gap-1 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
    },
    {
      default: () => [
        label,
        required ? h('span', { class: 'text-destructive' }, '*') : null,
        tooltip
          ? h('span', { class: 'text-muted-foreground cursor-help text-xs', title: tooltip.description }, '(?)')
          : null,
      ],
    },
  )
}
