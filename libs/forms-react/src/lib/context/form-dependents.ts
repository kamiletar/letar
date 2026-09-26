'use client'

import { createDependentsRegistry, type DependentsRegistry } from '@letar/forms-core/uikit'
import { useState } from 'react'
import { useDeclarativeFormOptional } from './form-context'

/** Для корня формы: реестр зависимых полей (§18), один на форму */
export function useCreateDependentsRegistry(): DependentsRegistry {
  const [dependents] = useState(createDependentsRegistry)
  return dependents
}

/** Реестр зависимых полей формы; `null` вне формы или в обёртке без реестра */
export function useFormDependentsRegistry(): DependentsRegistry | null {
  return useDeclarativeFormOptional()?.dependents ?? null
}
