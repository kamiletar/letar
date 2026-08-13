import { useFormStepsContext } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { Check } from 'lucide-vue-next'
import { defineComponent, h, type PropType, type VNode } from 'vue'

/**
 * `Form.Steps.Indicator` — shadcn-скин (beta), Vue-порт `FormStepsIndicator` из
 * `@letar/forms-shadcn` (`libs/forms-shadcn/src/lib/steps/form-steps-indicator.tsx`).
 */
export const FormStepsIndicator = defineComponent({
  name: 'FormStepsIndicator',
  props: {
    /** Кастомная иконка завершённого шага (по умолчанию — галочка `lucide-vue-next` `Check`) */
    completedIcon: { type: [Object, String] as PropType<VNode | string>, required: false, default: undefined },
    /** Показывать описания шагов */
    showDescriptions: { type: Boolean, required: false, default: false },
    /** Разрешить клик по индикатору для навигации (отключено в linear-режиме) */
    clickable: { type: Boolean, required: false, default: true },
  },
  setup(props) {
    const { steps, linear, currentStep, goToStep } = useFormStepsContext()

    return () => {
      const isClickable = props.clickable && !linear
      const stepsList = steps.value
      const completedIcon = props.completedIcon ?? h(Check, { class: 'size-4' })

      return h(
        'ol',
        { class: 'flex items-center gap-2' },
        stepsList.map((step, i) => {
          const isCompleted = step.index < currentStep.value
          const isActive = step.index === currentStep.value

          return h('li', { key: step.index, class: 'flex flex-1 items-center gap-2' }, [
            h(
              'button',
              {
                type: 'button',
                disabled: !isClickable,
                onClick: () => goToStep(step.index),
                class: cn('flex items-center gap-2 text-left', !isClickable && 'cursor-default'),
              },
              [
                h(
                  'span',
                  {
                    class: cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                      isCompleted && 'bg-primary text-primary-foreground border-primary',
                      isActive && !isCompleted && 'border-ring text-foreground',
                      !isActive && !isCompleted && 'border-input text-muted-foreground',
                    ),
                  },
                  isCompleted ? completedIcon : (step.icon ?? String(step.index + 1)),
                ),
                h('span', {}, [
                  h(
                    'span',
                    { class: cn('block text-sm', isActive ? 'font-medium' : 'text-muted-foreground') },
                    step.title,
                  ),
                  props.showDescriptions && step.description
                    ? h('span', { class: 'text-muted-foreground block text-xs' }, step.description)
                    : null,
                ]),
              ],
            ),
            i < stepsList.length - 1 ? h('span', { class: 'bg-border h-px flex-1' }) : null,
          ])
        }),
      )
    }
  },
})
