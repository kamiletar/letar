import { useFormStepsContext } from '@letar/forms-vue/core'
import { defineComponent, h } from 'vue'

/**
 * `Form.Steps.Completed` — shadcn-скин. Vue-порт `FormStepsCompletedContent` из
 * `@letar/forms-shadcn` (`libs/forms-shadcn/src/lib/steps/form-steps-completed.tsx`). Показывается
 * после прохождения всех шагов.
 */
export const FormStepsCompleted = defineComponent({
  name: 'FormStepsCompleted',
  setup(_props, { slots }) {
    const { isCompleted } = useFormStepsContext()

    return () => (isCompleted.value ? h('div', {}, slots.default?.()) : null)
  },
})
