'use client'

import { type AnyFieldApi } from '@tanstack/react-form'
import { createContext, type ReactNode, useContext } from 'react'
import { useFormGroup } from './form-group'

/**
 * Context value for TanStackFormField
 * Provides both naming info and TanStack Form field API
 */
export interface TanStackFormFieldContextValue {
  /** Original name prop passed to this field */
  originalName: string
  /** Full dotted path including all parent FormGroup names */
  name: string
  /** TanStack Form field API */
  field: AnyFieldApi
}

const TanStackFormFieldContext = createContext<TanStackFormFieldContextValue | null>(null)

export interface TanStackFormFieldProps {
  /** Field name. Will be concatenated with parent FormGroup names using dot notation */
  name: string
  /** TanStack Form field API from form.Field or useField */
  field: AnyFieldApi
  /**
   * Either React elements or a render function receiving field info.
   * If function: receives { originalName, name, field } as parameter
   * If elements: can use useTanStackFormField() hook to access field info
   */
  children: ReactNode | ((props: TanStackFormFieldContextValue) => ReactNode)
}

/**
 * TanStackFormField component integrating TanStack Form with FormGroup context
 *
 * Combines TanStack Form's field API with FormGroup's dotted naming for
 * building complex nested form structures.
 *
 * @example
 * ```tsx
 * // Direct usage with form.Field
 * <form.Field name="email">
 *   {(field) => (
 *     <TanStackFormField name="email" field={field}>
 *       {({ field: f, name }) => (
 *         <Input
 *           name={name}
 *           value={f.state.value}
 *           onChange={(e) => f.handleChange(e.target.value)}
 *         />
 *       )}
 *     </TanStackFormField>
 *   )}
 * </form.Field>
 *
 * // Inside FormGroup
 * <FormGroup name="user">
 *   <form.Field name="user.email">
 *     {(field) => (
 *       <TanStackFormField name="email" field={field}>
 *         <ChakraTextField /> // uses useTanStackFormField() internally
 *       </TanStackFormField>
 *     )}
 *   </form.Field>
 * </FormGroup>
 * ```
 */
export function TanStackFormField({ name, field, children }: TanStackFormFieldProps) {
  const formGroupContext = useFormGroup()

  const contextValue: TanStackFormFieldContextValue = {
    originalName: name,
    name: formGroupContext ? `${formGroupContext.name}.${name}` : name,
    field,
  }

  const content = typeof children === 'function' ? children(contextValue) : children

  return <TanStackFormFieldContext.Provider value={contextValue}>{content}</TanStackFormFieldContext.Provider>
}

/**
 * Hook to access current TanStackFormField context
 *
 * @returns TanStackFormField context value with originalName, full dotted path name,
 *          and TanStack Form field API, or null if not inside a TanStackFormField
 *
 * @example
 * ```tsx
 * function MyInput() {
 *   const ctx = useTanStackFormField();
 *   if (!ctx) return null;
 *
 *   const { field, name } = ctx;
 *   return (
 *     <input
 *       name={name}
 *       value={field.state.value}
 *       onChange={(e) => field.handleChange(e.target.value)}
 *       onBlur={field.handleBlur}
 *     />
 *   );
 * }
 * ```
 */
export function useTanStackFormField(): TanStackFormFieldContextValue | null {
  return useContext(TanStackFormFieldContext)
}
