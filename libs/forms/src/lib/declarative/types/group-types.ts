'use client'

import type { ReactNode } from 'react'

/**
 * Props for Form.Group
 */
export interface FormGroupDeclarativeProps {
  /** Group name (creates namespace for nested fields) */
  name: string
  /** Group content */
  children: ReactNode
}

/**
 * Wrapper component props for Form.Group.List
 */
export interface FormGroupListWrapperProps {
  children: ReactNode
}

/**
 * Props for Form.Group.List
 */
export interface FormGroupListDeclarativeProps {
  /** Array field name */
  name: string
  /** Template for each array item (cloned for each element) */
  children: ReactNode
  /** Content to show when array is empty */
  emptyContent?: ReactNode
  /** Wrapper component for the entire list (useful for adding Add button) */
  wrapper?: (props: FormGroupListWrapperProps) => ReactNode
  /** Enable drag-and-drop sorting for array items */
  sortable?: boolean
  /** Maximum number of items (auto-detected from z.array().max()). Props take priority. */
  maxItems?: number
  /** Minimum number of items (auto-detected from z.array().min()). Props take priority. */
  minItems?: number
}

/**
 * Context value for Form.Group.List operations
 */
export interface FormGroupListContextValue<TItem = unknown> {
  /** Full path to the array field */
  fullPath: string
  /** Add new item to the array */
  pushValue: (value: TItem) => void
  /** Current array length */
  length: number
  /** Maximum number of items (from props or z.array().max()) */
  maxItems?: number
  /** Minimum number of items (from props or z.array().min()) */
  minItems?: number
  /** Whether more items can be added (length < maxItems or maxItems not set) */
  canAdd: boolean
  /** Whether items can be removed (length > minItems or minItems not set) */
  canRemove: boolean
}

/**
 * Context value for Form.Group.List item operations
 */
export interface FormGroupListItemContextValue {
  /** Index of this item in the array */
  index: number
  /** Remove this item from the array */
  remove: () => void
}
