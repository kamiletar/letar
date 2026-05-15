'use client'

import { type AnyFieldApi } from '@tanstack/react-form'
import { createContext, type ReactNode, useContext } from 'react'
import { FormGroup } from './form-group'

/**
 * Context value for FormGroupList array operations
 */
export interface FormGroupListContextValue<TItem = unknown> {
  /** Array field API for add/remove operations */
  pushValue: (value: TItem) => void
  removeValue: (index: number) => void
  moveValue: (from: number, to: number) => void
  swapValues: (indexA: number, indexB: number) => void
  insertValue: (index: number, value: TItem) => void
  replaceValue: (index: number, value: TItem) => void
  /** Current array values */
  values: TItem[]
  /** Number of items in the array */
  length: number
}

/**
 * Context value for FormGroupListItem
 */
export interface FormGroupListItemContextValue {
  /** Index of this item in the array */
  index: number
  /** Remove this item from the array */
  remove: () => void
  /** Whether this is the first item */
  isFirst: boolean
  /** Whether this is the last item */
  isLast: boolean
  /** Move this item up (swap with previous) */
  moveUp: () => void
  /** Move this item down (swap with next) */
  moveDown: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FormGroupListContext = createContext<FormGroupListContextValue<any> | null>(null)
const FormGroupListItemContext = createContext<FormGroupListItemContextValue | null>(null)

export interface FormGroupListProps<TItem = unknown> {
  /** Field name for this array group */
  name: string
  /** TanStack Form field API with mode="array" */
  field: AnyFieldApi
  /**
   * Render function for array items.
   * Receives item, index, and array field operations.
   */
  children: (items: TItem[], ctx: FormGroupListContextValue<TItem>) => ReactNode
  /** Content to show when array is empty */
  emptyContent?: ReactNode
}

/**
 * FormGroupList - Component for managing array fields with TanStack Form
 *
 * Provides array operations (add, remove, move, swap) and integrates with
 * FormGroup for nested field naming.
 *
 * @example
 * ```tsx
 * <form.Field name="phones" mode="array">
 *   {(phonesField) => (
 *     <FormGroupList name="phones" field={phonesField} emptyContent="No phones added">
 *       {(items, { pushValue }) => (
 *         <>
 *           {items.map((_, index) => (
 *             <FormGroupListItem key={index} index={index}>
 *               {({ remove }) => (
 *                 <FormGroup name={String(index)}>
 *                   <form.Field name={`phones[${index}].number`}>
 *                     {(field) => <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
 *                   </form.Field>
 *                   <Button onClick={remove}>Remove</Button>
 *                 </FormGroup>
 *               )}
 *             </FormGroupListItem>
 *           ))}
 *           <Button onClick={() => pushValue({ number: '' })}>Add Phone</Button>
 *         </>
 *       )}
 *     </FormGroupList>
 *   )}
 * </form.Field>
 * ```
 */
export function FormGroupList<TItem = unknown>({ name, field, children, emptyContent }: FormGroupListProps<TItem>) {
  const values = ((field.state.value as unknown[]) ?? []) as TItem[]

  const contextValue: FormGroupListContextValue<TItem> = {
    pushValue: (value: TItem) => field.pushValue(value),
    removeValue: (index: number) => field.removeValue(index),
    moveValue: (from: number, to: number) => field.moveValue(from, to),
    swapValues: (indexA: number, indexB: number) => field.swapValues(indexA, indexB),
    insertValue: (index: number, value: TItem) => field.insertValue(index, value),
    replaceValue: (index: number, value: TItem) => field.replaceValue(index, value),
    values,
    length: values.length,
  }

  const content = values.length === 0 && emptyContent ? emptyContent : children(values, contextValue)

  return (
    <FormGroup name={name}>
      <FormGroupListContext.Provider value={contextValue}>{content}</FormGroupListContext.Provider>
    </FormGroup>
  )
}

export interface FormGroupListItemProps {
  /** Index of this item in the array */
  index: number
  /**
   * Render function receiving item context with remove and move operations
   */
  children: ReactNode | ((ctx: FormGroupListItemContextValue) => ReactNode)
}

/**
 * FormGroupListItem - Wrapper for individual array items
 *
 * Provides item-specific operations (remove, move up/down) and
 * creates a FormGroup with the item index as name.
 *
 * @example
 * ```tsx
 * <FormGroupListItem index={index}>
 *   {({ remove, moveUp, moveDown, isFirst, isLast }) => (
 *     <HStack>
 *       <Input />
 *       <Button onClick={moveUp} disabled={isFirst}>Up</Button>
 *       <Button onClick={moveDown} disabled={isLast}>Down</Button>
 *       <Button onClick={remove}>Remove</Button>
 *     </HStack>
 *   )}
 * </FormGroupListItem>
 * ```
 */
export function FormGroupListItem({ index, children }: FormGroupListItemProps) {
  const listContext = useFormGroupList()

  if (!listContext) {
    throw new Error('FormGroupListItem must be used inside FormGroupList')
  }

  const itemContext: FormGroupListItemContextValue = {
    index,
    remove: () => listContext.removeValue(index),
    isFirst: index === 0,
    isLast: index === listContext.length - 1,
    moveUp: () => {
      if (index > 0) {
        listContext.swapValues(index, index - 1)
      }
    },
    moveDown: () => {
      if (index < listContext.length - 1) {
        listContext.swapValues(index, index + 1)
      }
    },
  }

  const content = typeof children === 'function' ? children(itemContext) : children

  return (
    <FormGroup name={String(index)}>
      <FormGroupListItemContext.Provider value={itemContext}>{content}</FormGroupListItemContext.Provider>
    </FormGroup>
  )
}

/**
 * Hook to access FormGroupList context with array operations
 *
 * @returns FormGroupList context with pushValue, removeValue, etc.
 *          or null if not inside a FormGroupList
 */
export function useFormGroupList<TItem = unknown>(): FormGroupListContextValue<TItem> | null {
  return useContext(FormGroupListContext)
}

/**
 * Hook to access FormGroupListItem context with item operations
 *
 * @returns FormGroupListItem context with remove, moveUp, moveDown, etc.
 *          or null if not inside a FormGroupListItem
 */
export function useFormGroupListItem(): FormGroupListItemContextValue | null {
  return useContext(FormGroupListItemContext)
}
