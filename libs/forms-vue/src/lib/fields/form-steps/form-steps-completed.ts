import { defineComponent, h } from 'vue'
import { useFormStepsContext } from '../../core/form-steps-context'

/** `Form.Steps.Completed` — headless-версия. Показывается после прохождения всех шагов. */
export const FormStepsCompleted = defineComponent({
  name: 'FormStepsCompleted',
  setup(_props, { slots }) {
    const { isCompleted } = useFormStepsContext()

    return () => (isCompleted.value ? h('div', { class: 'letar-form-steps__completed' }, slots.default?.()) : null)
  },
})
