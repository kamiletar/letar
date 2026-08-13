import { defineComponent, h, type PropType, watch } from 'vue'
import { useAppFormContext } from '../core/form-context'

/** Скрытое поле — не рендерится в DOM, но участвует в form state (utm-метки, referral-коды). */
export const FieldHidden = defineComponent({
  name: 'FieldHidden',
  props: {
    name: { type: String, required: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- значение произвольного поля формы
    value: { type: null as unknown as PropType<any>, required: false, default: undefined },
  },
  setup(props) {
    const { form } = useAppFormContext()

    return () =>
      h(form.Field, { name: props.name }, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        default: ({ field }: { field: any }) => {
          watch(
            () => props.value,
            (value) => {
              if (value !== undefined && !Object.is(field.state.value, value)) {
                field.handleChange(value)
              }
            },
            { immediate: true },
          )
          return null
        },
      })
  },
})
