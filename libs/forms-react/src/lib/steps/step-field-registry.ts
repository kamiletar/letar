'use client'

import { createContext, useContext } from 'react'

/**
 * Мост между полем и активным шагом `Form.Steps`, независимый от UI-скина.
 *
 * Нужен затем, что `fieldNames` шага раньше вычислялись только статическим обходом JSX
 * `children` (`extractFieldNames`) — обход не видит поля, спрятанные внутри кастомного
 * nullary-компонента (`function BasicFields() { return <Field.String name="name" /> }`),
 * потому что у `<BasicFields />` как элемента нет собственного `props.children`: обход не
 * может узнать, что рендерит функция, без её вызова. При таком паттерне `fieldNames` шага
 * оказывался пустым, и `validateCurrentStep` (`use-step-navigation.ts`) тихо считал шаг
 * непроверяемым — навигация "Далее" проходила без единой ошибки валидации.
 *
 * Каждое смонтированное поле регистрируется здесь по своему `fullPath` — скин Form.Steps
 * провайдит реализацию, привязанную к конкретному шагу, и объединяет эти пути со
 * статическим списком вместо того, чтобы полагаться на него целиком.
 */
export interface FormStepsFieldRegistryContextValue {
  registerField: (fullPath: string) => void
  unregisterField: (fullPath: string) => void
}

export const FormStepsFieldRegistryContext = createContext<FormStepsFieldRegistryContextValue | null>(null)

/** Контекст присутствует только внутри `Form.Steps.Step` скина, который его провайдит. */
export function useFormStepsFieldRegistry(): FormStepsFieldRegistryContextValue | null {
  return useContext(FormStepsFieldRegistryContext)
}
