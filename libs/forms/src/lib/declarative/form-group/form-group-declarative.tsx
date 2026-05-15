'use client'

import type { ReactElement } from 'react'
import { FormGroup } from '../../form-group'
import type { FormGroupDeclarativeProps } from '../types'

/**
 * Form.Group - Creates a namespace for nested fields
 *
 * Wraps children in a FormGroup to build hierarchical field paths.
 * Nested groups create dot-notation paths (e.g., "info.base.type").
 *
 * @example
 * ```tsx
 * // Creates path: info.base.type
 * <Form.Group name="info">
 *   <Form.Group name="base">
 *     <Form.Field.String name="type" />
 *   </Form.Group>
 * </Form.Group>
 * ```
 */
export function FormGroupDeclarative({ name, children }: FormGroupDeclarativeProps): ReactElement {
  return <FormGroup name={name}>{children}</FormGroup>
}
