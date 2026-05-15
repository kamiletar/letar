'use client'

import { createContext, useContext } from 'react'
import type { FormGroupListContextValue, FormGroupListItemContextValue } from '../types'

/**
 * Context for Form.Group.List operations (add items)
 */
export const FormGroupListContext = createContext<FormGroupListContextValue | null>(null)

/**
 * Context for Form.Group.List item operations (remove item)
 */
export const FormGroupListItemContext = createContext<FormGroupListItemContextValue | null>(null)

/**
 * Hook to access Form.Group.List context
 * @throws Error if used outside of Form.Group.List
 */
export function useFormGroupListContext(): FormGroupListContextValue {
  const context = useContext(FormGroupListContext)
  if (!context) {
    throw new Error('useFormGroupListContext must be used inside Form.Group.List')
  }
  return context
}

/**
 * Hook to access Form.Group.List item context
 * @throws Error if used outside of Form.Group.List item
 */
export function useFormGroupListItemContext(): FormGroupListItemContextValue {
  const context = useContext(FormGroupListItemContext)
  if (!context) {
    throw new Error('useFormGroupListItemContext must be used inside Form.Group.List item')
  }
  return context
}
