import { Children, isValidElement, type ReactNode } from 'react'

/**
 * Рекурсивно извлекает имена полей из children (для интеграции с валидацией шагов
 * Form.Steps и скрытием полей в Form.When). `Form.Group` создаёт namespace через `.`,
 * `Form.Group.List` не рекурсируется — массивы обрабатываются отдельно.
 */
export function extractFieldNames(children: ReactNode, parentPath = ''): string[] {
  const names: string[] = []

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return
    }

    const props = child.props as Record<string, unknown>

    if (typeof props.name === 'string') {
      const fullName = parentPath ? `${parentPath}.${props.name}` : props.name
      names.push(fullName)
    }

    const displayName = (child.type as { displayName?: string })?.displayName
    if (displayName === 'FormGroupDeclarative' && typeof props.name === 'string') {
      const groupPath = parentPath ? `${parentPath}.${props.name}` : props.name
      if (props.children) {
        names.push(...extractFieldNames(props.children as ReactNode, groupPath))
      }
    } else if (props.children && displayName !== 'FormGroupListDeclarative') {
      names.push(...extractFieldNames(props.children as ReactNode, parentPath))
    }
  })

  return names
}
