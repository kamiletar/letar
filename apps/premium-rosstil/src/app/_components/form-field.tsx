'use client'

import { createContext, type ReactNode, useContext } from 'react'
import { useFormGroup } from './form-group'

/**
 * Context value for FormField
 */
export interface FormFieldContextValue {
  /** Original name prop passed to this FormField */
  originalName: string
  /** Full dotted path including all parent FormGroup/FormField names */
  name: string
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null)

export interface FormFieldProps {
  /** Field name. Will be concatenated with parent FormGroup names using dot notation */
  name: string
  /**
   * Either React elements or a render function receiving field naming info.
   * If function: receives { originalName, name } as parameter
   * If elements: can use useFormField() hook to access field naming info
   */
  children: ReactNode | ((props: FormFieldContextValue) => ReactNode)
}

/**
 * FormField component for building form field names
 *
 * Uses FormGroup context to build dotted path names.
 * Supports two usage patterns:
 * 1. Render prop: Pass a function to receive field naming info directly
 * 2. Context: Pass regular elements that use useFormField() hook
 *
 * @example
 * ```tsx
 * // Render prop pattern
 * <FormField name="email">
 *   {({ name }) => <Input name={name} />}
 * </FormField>
 *
 * // Context pattern with hook
 * <FormField name="email">
 *   <MyCustomInput /> // uses useFormField() internally
 * </FormField>
 *
 * // Inside FormGroup
 * <FormGroup name="user">
 *   <FormField name="email">
 *     {({ name }) => <Input name={name} />} // name="user.email"
 *   </FormField>
 * </FormGroup>
 * ```
 */
export function FormField({ name, children }: FormFieldProps) {
  const formGroupContext = useFormGroup()

  const contextValue: FormFieldContextValue = {
    originalName: name,
    name: formGroupContext ? `${formGroupContext.name}.${name}` : name,
  }

  const content = typeof children === 'function' ? children(contextValue) : children

  return <FormFieldContext.Provider value={contextValue}>{content}</FormFieldContext.Provider>
}

/**
 * Hook to access current FormField context
 *
 * @returns FormField context value with originalName and full dotted path name,
 *          or null if not inside a FormField
 *
 * @example
 * ```tsx
 * function MyInput() {
 *   const formField = useFormField();
 *   return <input name={formField?.name} />;
 * }
 * ```
 */
export function useFormField(): FormFieldContextValue | null {
  return useContext(FormFieldContext)
}
