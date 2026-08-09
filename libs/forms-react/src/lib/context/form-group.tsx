'use client'

import { createContext, type ReactNode, useContext } from 'react'

/**
 * Context value providing form field naming information
 */
export interface FormGroupContextValue {
  /** Original name prop passed to this FormGroup */
  originalName: string
  /** Full dotted path including all parent FormGroup names */
  name: string
}

const FormGroupContext = createContext<FormGroupContextValue | null>(null)

export interface FormGroupProps {
  /** Field name for this group. Will be concatenated with parent names using dot notation */
  name: string
  children: ReactNode
}

/**
 * FormGroup component for building nested form field names
 *
 * @example
 * ```tsx
 * <FormGroup name="user">
 *   <FormGroup name="address">
 *     <FormGroup name="street">
 *       // useFormGroup() returns { originalName: 'street', name: 'user.address.street' }
 *     </FormGroup>
 *   </FormGroup>
 * </FormGroup>
 * ```
 */
export function FormGroup({ name, children }: FormGroupProps) {
  const parentContext = useContext(FormGroupContext)

  const contextValue: FormGroupContextValue = {
    originalName: name,
    name: parentContext ? `${parentContext.name}.${name}` : name,
  }

  return <FormGroupContext.Provider value={contextValue}>{children}</FormGroupContext.Provider>
}

/**
 * Hook to access current FormGroup context
 *
 * @returns FormGroup context value with originalName and full dotted path name,
 *          or null if not inside a FormGroup
 *
 * @example
 * ```tsx
 * function MyField() {
 *   const formGroup = useFormGroup();
 *   const fieldName = formGroup?.name || 'defaultName';
 *   return <input name={fieldName} />;
 * }
 * ```
 */
export function useFormGroup(): FormGroupContextValue | null {
  return useContext(FormGroupContext)
}
