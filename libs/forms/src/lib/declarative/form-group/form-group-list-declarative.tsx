'use client'

import { type ComponentType, Fragment, type ReactElement, type ReactNode } from 'react'
import { FormGroup, useFormGroup } from '../../form-group'
import { DeclarativeFormContext, useDeclarativeForm } from '../form-context'
import { getZodConstraints } from '../schema-constraints'
import type {
  DeclarativeFormContextValue,
  FormGroupListContextValue,
  FormGroupListDeclarativeProps,
  FormGroupListItemContextValue,
} from '../types'
import { FormGroupListContext, FormGroupListItemContext } from './form-group-list-context'
import { SortableItem, SortableWrapper } from './form-group-list-sortable'

/** Пропсы обёртки всего списка (`ListWrapper`): то же, что у `SortableWrapper` из dnd-kit-слоя */
export interface FormGroupListWrapperSlotProps {
  /** Детерминированный между SSR и клиентом id списка */
  id: string
  /** Уникальные id элементов в текущем порядке */
  items: string[]
  /** Перестановка: из индекса в индекс */
  onReorder: (oldIndex: number, newIndex: number) => void
  children: ReactNode
}

/** Пропсы обёртки одного элемента (`ItemWrapper`): то же, что у `SortableItem` */
export interface FormGroupListItemSlotProps {
  /** Уникальный id элемента */
  id: string
  children: ReactNode
}

/**
 * Внутренние (не публичные) слоты списка. Через них dnd-kit-слой (`SortableGroupList` из `@letar/forms/sortable`)
 * подставляет свои обёртки, а сам список о dnd-kit не знает. По умолчанию слотов нет: элементы выводятся как есть.
 */
export interface FormGroupListSlots {
  ListWrapper?: ComponentType<FormGroupListWrapperSlotProps>
  ItemWrapper?: ComponentType<FormGroupListItemSlotProps>
}

/**
 * Form.Group.List - Automatically iterates over array fields
 *
 * For object arrays: children are cloned for each element with FormGroup index
 * For primitive arrays: children without name get direct array index access
 *
 * Automatically extracts from Zod schema:
 * - `maxItems` from `z.array().max(5)` — disables Add button when limit is reached
 * - `minItems` from `z.array().min(1)` — disables Remove button when below minimum
 * - `helperText` hint "Maximum 5 items" (via Form.Group.List wrapper)
 *
 * Props always take priority over automatic values from the schema.
 *
 * @example Object array with auto constraints from Zod
 * ```tsx
 * // In schema: z.object({ tags: z.array(z.string()).min(1).max(5) })
 * <Form.Group.List
 *   name="tags"
 *   wrapper={({ children }) => (
 *     <VStack>
 *       {children}
 *       <Form.Group.List.Button.Add />
 *       {/* Add button is automatically disabled at 5 items *\/}
 *     </VStack>
 *   )}
 * >
 *   <HStack>
 *     <Form.Field.String />
 *     <Form.Group.List.Button.Remove />
 *     {/* Remove button is automatically disabled at 1 item *\/}
 *   </HStack>
 * </Form.Group.List>
 * ```
 */
export function FormGroupListDeclarative(props: FormGroupListDeclarativeProps): ReactElement {
  return <FormGroupListBase {...props} />
}

/**
 * Реализация списка со слотами обёрток. Публичный `Form.Group.List` — `FormGroupListDeclarative` (без слотов);
 * слоты нужны только `SortableGroupList`, поэтому наружу пакета эта функция не экспортируется.
 */
export function FormGroupListBase({
  name,
  children,
  emptyContent,
  wrapper,
  sortable = false,
  maxItems: maxItemsProp,
  minItems: minItemsProp,
  ListWrapper: ListWrapperSlot,
  ItemWrapper: ItemWrapperSlot,
}: FormGroupListDeclarativeProps & FormGroupListSlots): ReactElement {
  // Проп `sortable` (встроенный в ядро в 2.x) подставляет те же обёртки dnd-kit, что и SortableGroupList
  const ListWrapper = ListWrapperSlot ?? (sortable ? SortableWrapper : undefined)
  const ItemWrapper = ItemWrapperSlot ?? (sortable ? SortableItem : undefined)
  const { form, schema, dependents } = useDeclarativeForm()
  const parentGroup = useFormGroup()

  // Build full path from parent groups
  const fullPath = parentGroup ? `${parentGroup.name}.${name}` : name

  // Extract constraints for the array
  const constraints = getZodConstraints(schema, fullPath)

  // Props take priority over constraints
  const maxItems = maxItemsProp ?? constraints.array?.maxItems
  const minItems = minItemsProp ?? constraints.array?.minItems

  // Use form.Field with mode="array" for reactive array state
  return (
    <form.Field name={fullPath} mode="array">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(arrayField: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const arrayValue = (arrayField.state.value as any[] | undefined) ?? []

        // Compute canAdd and canRemove based on constraints
        const canAdd = maxItems === undefined || arrayValue.length < maxItems
        const canRemove = minItems === undefined || arrayValue.length > minItems

        // List context for Add button - use arrayField methods
        const listContextValue: FormGroupListContextValue = {
          fullPath,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pushValue: (value: any) => arrayField.pushValue(value),
          length: arrayValue.length,
          maxItems,
          minItems,
          canAdd,
          canRemove,
        }

        // Handle drag end for sortable
        const handleReorder = (oldIndex: number, newIndex: number) => {
          arrayField.moveValue(oldIndex, newIndex)
        }

        // Generate IDs for sortable items
        const sortableIds = arrayValue.map((_, index) => `${fullPath}-${index}`)

        // Render single item
        const renderItem = (index: number): ReactNode => {
          // Form context with primitiveArrayIndex
          const formContextValue: DeclarativeFormContextValue = {
            form,
            schema,
            primitiveArrayIndex: index,
            // Реестр зависимых полей формы (§18): без него `dependsOn` внутри строки не очищал бы значение
            dependents,
          }

          // Item context for Remove button - use arrayField.removeValue
          const itemContextValue: FormGroupListItemContextValue = {
            index,
            remove: () => arrayField.removeValue(index),
          }

          const itemContent = (
            <DeclarativeFormContext.Provider value={formContextValue}>
              <FormGroupListItemContext.Provider value={itemContextValue}>
                <FormGroup name={String(index)}>{children}</FormGroup>
              </FormGroupListItemContext.Provider>
            </DeclarativeFormContext.Provider>
          )

          // Обёртка элемента (SortableItem для сортируемого списка)
          if (ItemWrapper) {
            return (
              <ItemWrapper key={sortableIds[index]} id={sortableIds[index]}>
                {itemContent}
              </ItemWrapper>
            )
          }

          return <Fragment key={index}>{itemContent}</Fragment>
        }

        // Render all items
        const renderItems = (): ReactNode => {
          if (arrayValue.length === 0 && emptyContent) {
            return emptyContent
          }

          const items = arrayValue.map((_, index) => renderItem(index))

          // Обёртка всего списка (SortableWrapper для сортируемого списка)
          if (ListWrapper) {
            return (
              <ListWrapper id={fullPath} items={sortableIds} onReorder={handleReorder}>
                {items}
              </ListWrapper>
            )
          }

          return items
        }

        // Wrap everything in FormGroup for path building
        const content = wrapper ? wrapper({ children: renderItems() }) : renderItems()

        return (
          <FormGroupListContext.Provider value={listContextValue}>
            <FormGroup name={name}>
              {/* Fragment needed when wrapper returns array */}
              <Fragment>{content}</Fragment>
            </FormGroup>
          </FormGroupListContext.Provider>
        )
      }}
    </form.Field>
  )
}
