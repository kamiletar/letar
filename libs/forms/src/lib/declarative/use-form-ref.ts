'use client'

import { type RefObject, useRef } from 'react'
import type { AppFormApi } from './types'

/**
 * Creates a ref for accessing a form instance from outside the <Form> tree.
 *
 * Pass the ref as `formRef` prop to <Form>.
 * Then call methods like `reset()`, `setFieldValue()`, or read `state.isDirty`
 * from a parent component, toolbar, or header.
 *
 * @example
 * ```tsx
 * function CatalogPage() {
 *   const filterRef = useFormRef()
 *
 *   return (
 *     <>
 *       <Header>
 *         <Button onClick={() => filterRef.current?.reset()}>
 *           Clear filters
 *         </Button>
 *       </Header>
 *
 *       <Form
 *         formRef={filterRef}
 *         schema={FilterSchema}
 *         initialValue={defaults}
 *       >
 *         <Form.Field.String name="search" />
 *       </Form>
 *     </>
 *   )
 * }
 * ```
 */
export function useFormRef<TData extends object = object>(): RefObject<AppFormApi | null> {
  return useRef<AppFormApi | null>(null)
}
