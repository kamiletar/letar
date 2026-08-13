import { computed, defineComponent, h, ref } from 'vue'
import { demoExamples } from './examples/index'

/**
 * Навигационная оболочка демо-харнесса — сам код полей живёт в `examples/*.ts` (по одному примеру
 * на файл, Этап 0 P7 form-docs). Роутер-либа избыточна для 6 примеров — переключение через `ref`.
 */
export const App = defineComponent({
  name: 'App',
  setup() {
    const activeId = ref(demoExamples[0]!.id)
    const active = computed(() => demoExamples.find((example) => example.id === activeId.value) ?? demoExamples[0]!)

    return () =>
      h('div', { class: 'space-y-6' }, [
        h('h1', { class: 'text-xl font-semibold' }, '@letar/forms-vue-shadcn — demo'),
        h(
          'select',
          {
            class: 'border-input rounded-md border px-3 py-2 text-sm',
            value: activeId.value,
            onChange: (event: Event) => {
              activeId.value = (event.target as HTMLSelectElement).value
            },
          },
          demoExamples.map((example) => h('option', { value: example.id }, example.title)),
        ),
        h(active.value.component),
      ])
  },
})
