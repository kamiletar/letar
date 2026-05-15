'use client'

import { Fragment, type ReactElement, type ReactNode } from 'react'
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
export function FormGroupListDeclarative({
  name,
  children,
  emptyContent,
  wrapper,
  sortable = false,
  maxItems: maxItemsProp,
  minItems: minItemsProp,
}: FormGroupListDeclarativeProps): ReactElement {
  const { form, schema } = useDeclarativeForm()
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

          // Wrap in SortableItem if sortable
          if (sortable) {
            return (
              <SortableItem key={sortableIds[index]} id={sortableIds[index]}>
                {itemContent}
              </SortableItem>
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

          // Wrap in SortableWrapper if sortable
          if (sortable) {
            return (
              <SortableWrapper items={sortableIds} onReorder={handleReorder}>
                {items}
              </SortableWrapper>
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
