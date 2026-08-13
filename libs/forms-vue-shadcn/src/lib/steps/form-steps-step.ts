import { extractFieldNames, type StepInfo, useFormStepsContext } from '@letar/forms-vue/core'
import { defineComponent, h, onMounted, onUnmounted, type PropType, type VNode, watch } from 'vue'

export type { StepInfo }

/**
 * `Form.Steps.Step` — shadcn-скин (beta), Vue-порт `FormStepsStep` из `@letar/forms-shadcn`
 * (`libs/forms-shadcn/src/lib/steps/form-steps-step.tsx`). Регистрация/индексация/извлечение
 * имён полей (`extractFieldNames`) — целиком переиспользованы из `@letar/forms-vue/core`, не
 * копия: тот же код обслуживает headless-версию `Form.Steps.Step` в `@letar/forms-vue`.
 */
export const FormStepsStep = defineComponent({
  name: 'FormStepsStep',
  props: {
    title: { type: String, required: true },
    description: { type: String, required: false, default: undefined },
    icon: { type: [Object, String] as PropType<VNode | string | undefined>, required: false, default: undefined },
    onEnter: { type: Function as PropType<() => void>, required: false, default: undefined },
    onLeave: {
      type: Function as PropType<(direction: 'forward' | 'backward') => Promise<boolean> | boolean>,
      required: false,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const { registerStep, unregisterStep, claimedIndices, currentStep } = useFormStepsContext()

    let index = 0
    while (claimedIndices.has(index)) {
      index++
    }
    claimedIndices.add(index)

    const fieldNames = extractFieldNames(slots.default?.())

    function buildStepInfo(): StepInfo {
      return {
        index,
        title: props.title,
        description: props.description,
        icon: props.icon,
        fieldNames,
        onEnter: props.onEnter,
        onLeave: props.onLeave,
      }
    }

    onMounted(() => {
      registerStep(buildStepInfo())
    })

    watch(
      () => [props.title, props.description, props.onEnter, props.onLeave] as const,
      () => registerStep(buildStepInfo()),
    )

    onUnmounted(() => {
      unregisterStep(index)
    })

    return () => {
      if (index !== currentStep.value) {
        return null
      }
      return h('div', { 'data-step-index': index }, slots.default?.())
    }
  },
})
