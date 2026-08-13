import { defineComponent, h, type PropType, type VNode } from 'vue'
import { useFormStepsContext } from '../../core/form-steps-context'

/**
 * `Form.Steps.Indicator` — headless-версия. Прогресс-индикатор шагов, нативная разметка
 * (`<ol>`/`<button>`) без каких-либо стилей — Tailwind-версия того же компонента в
 * `@letar/forms-vue-shadcn` переиспользует `useFormStepsContext`, не эту разметку.
 */
export const FormStepsIndicator = defineComponent({
  name: 'FormStepsIndicator',
  props: {
    /** Кастомная иконка завершённого шага (по умолчанию — символ ✓) */
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

      return h(
        'ol',
        { class: 'letar-form-steps__indicator' },
        stepsList.map((step, i) => {
          const isCompleted = step.index < currentStep.value
          const isActive = step.index === currentStep.value

          return h('li', { key: step.index, class: 'letar-form-steps__indicator-item' }, [
            h(
              'button',
              {
                type: 'button',
                disabled: !isClickable,
                onClick: () => goToStep(step.index),
                class: [
                  'letar-form-steps__indicator-button',
                  isCompleted ? 'letar-form-steps__indicator-button--completed' : null,
                  isActive && !isCompleted ? 'letar-form-steps__indicator-button--active' : null,
                ],
              },
              [
                h(
                  'span',
                  { class: 'letar-form-steps__indicator-marker' },
                  isCompleted ? (props.completedIcon ?? '✓') : (step.icon ?? String(step.index + 1)),
                ),
                h('span', { class: 'letar-form-steps__indicator-text' }, [
                  h(
                    'span',
                    {
                      class: [
                        'letar-form-steps__indicator-title',
                        isActive ? 'letar-form-steps__indicator-title--active' : null,
                      ],
                    },
                    step.title,
                  ),
                  props.showDescriptions && step.description
                    ? h('span', { class: 'letar-form-steps__indicator-description' }, step.description)
                    : null,
                ]),
              ],
            ),
            i < stepsList.length - 1 ? h('span', { class: 'letar-form-steps__indicator-separator' }) : null,
          ])
        }),
      )
    }
  },
})
