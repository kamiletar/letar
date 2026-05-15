'use client'

import type { CartView } from '@/lib/cart'
import { Box, Stack } from '@chakra-ui/react'
import { useState } from 'react'
import { CheckoutForm } from './checkout-form'
import { CheckoutSummary } from './checkout-summary'

interface CheckoutClientWrapperProps {
  cart: CartView
  totalMeters: number
}

/**
 * Клиентская обёртка чекаута — поднимает общий state стоимости доставки
 * для синхронизации между CheckoutForm и CheckoutSummary.
 */
export function CheckoutClientWrapper({ cart, totalMeters }: CheckoutClientWrapperProps) {
  const [shippingCostKopecks, setShippingCostKopecks] = useState(0)
  const [isCalcShipping, setIsCalcShipping] = useState(false)
  const [postalCode, setPostalCode] = useState('')

  return (
    <Stack gap={8} direction={{ base: 'column', lg: 'row' }} align="start">
      <Box flex="2" minW={0}>
        <CheckoutForm
          totalMeters={totalMeters}
          onShippingCostChange={setShippingCostKopecks}
          onCalcStateChange={setIsCalcShipping}
          onPostalCodeChange={setPostalCode}
        />
      </Box>
      <Box flex="1" minW={{ lg: '320px' }} position={{ lg: 'sticky' }} top={{ lg: 4 }}>
        <CheckoutSummary
          cart={cart}
          shippingCostKopecks={shippingCostKopecks}
          isCalcShipping={isCalcShipping}
          postalCode={postalCode}
        />
      </Box>
    </Stack>
  )
}
