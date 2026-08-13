import { defineComponent, h, onMounted, onUnmounted, type PropType, type VNode, watch } from 'vue'
import { extractFieldNames } from '../../core/field-name-extraction'
import { useFormStepsContext } from '../../core/form-steps-context'
import type { StepInfo } from '../../core/step-types'

export type { StepInfo }

/**
 * `Form.Steps.Step` — headless-версия. Регистрирует себя в `FormSteps`, содержимое — поля шага.
 * Имена полей извлекаются автоматически для валидации при переходе (см. `field-name-extraction.ts`).
 *
 * Индекс шага назначается атомарно в `setup()` (не в `onMounted`, в отличие от React-версии,
 * которой нужен `useRef` + guard от Strict-Mode двойного вызова эффекта) — Vue `setup()`
 * гарантированно выполняется один раз за инстанс компонента, гонки индексов между несколькими
 * `Step` нет.
 *
 * Beta-упрощения — как у `@letar/forms-shadcn`: без `when` (условное отображение шага) и без
 * `segment` (авто-обёртка `Form.Group`), без анимации перехода между шагами.
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

    // fieldNames извлекаются один раз при создании компонента — дальнейшие изменения содержимого
    // шага (условный рендер полей внутри) не отслеживаются, как и в React-версии.
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
      return h('div', { class: 'letar-form-steps__step', 'data-step-index': index }, slots.default?.())
    }
  },
})
