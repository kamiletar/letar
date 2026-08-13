import { isVNode, type VNode } from 'vue'

/**
 * Извлекает имена полей из слотового содержимого шага — рекурсивно ищет vnode с пропом `name`.
 * Vue-аналог `extractFieldNames` из `@letar/forms-shadcn`
 * (`libs/forms-shadcn/src/lib/steps/form-steps-step.tsx`, обходит `ReactNode` через `Children.forEach`).
 *
 * Vue-vnode-дерево устроено иначе: обычные элемент-vnode хранят детей как массив в `.children`,
 * а vnode компонента со слотами — как объект `{ default: () => VNode[] }`. Функция обходит оба
 * случая; массив с полем-компонентом внутри плоского `<div>` покрывается тем же кодом, что и
 * прямой список детей `FormStepsStep`.
 */
export function extractFieldNames(nodes: VNode[] | VNode | undefined): string[] {
  const names: string[] = []
  const list = Array.isArray(nodes) ? nodes : nodes ? [nodes] : []

  for (const node of list) {
    if (!isVNode(node)) {
      continue
    }

    const props = node.props as Record<string, unknown> | null
    if (props && typeof props.name === 'string') {
      names.push(props.name)
    }

    const children = node.children
    if (Array.isArray(children)) {
      names.push(...extractFieldNames(children as VNode[]))
    } else if (
      children && typeof children === 'object' && typeof (children as { default?: unknown }).default === 'function'
    ) {
      const slotFn = (children as { default: () => VNode[] }).default
      names.push(...extractFieldNames(slotFn()))
    }
  }

  return names
}
