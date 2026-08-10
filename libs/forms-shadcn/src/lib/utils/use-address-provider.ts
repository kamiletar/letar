'use client'

import type { AddressProvider } from '@letar/forms-core/address'
import { createDaDataProvider } from '@letar/forms-core/address'
import { useDeclarativeFormOptional } from '@letar/forms-react'
import { useMemo } from 'react'

/** Резолв провайдера: проп → контекст формы → token-фолбэк. Общий для FieldAddress и FieldCity. */
export function useResolvedAddressProvider(propProvider?: AddressProvider, token?: string): AddressProvider | null {
  const formContext = useDeclarativeFormOptional()
  const tokenProvider = useMemo(() => (token ? createDaDataProvider({ token }) : null), [token])

  if (propProvider) { return propProvider }
  if (formContext?.addressProvider) { return formContext.addressProvider }
  return tokenProvider
}
