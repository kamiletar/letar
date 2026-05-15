import { requireSeller } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { sellerTaxSystemLabels } from '@/premium-rosstil-form/labels'
import { Badge, Heading, Text, VStack } from '@chakra-ui/react'
import { SellerSettingsForm } from './seller-settings-form'

/**
 * Настройки магазина продавца.
 */
export default async function SellerSettingsPage() {
  const user = await requireSeller()
  const db = getEnhancedPrisma(user)

  const seller = await db.seller.findUnique({
    where: { userId: user.id },
  })

  if (!seller) {
    return <Text>Профиль продавца не найден.</Text>
  }

  return (
    <VStack gap={6} align="stretch">
      <VStack align="flex-start" gap={1}>
        <Heading size="xl">Настройки магазина</Heading>
        {seller.taxSystem && (
          <Badge colorPalette="fg">{sellerTaxSystemLabels[seller.taxSystem] ?? seller.taxSystem}</Badge>
        )}
      </VStack>

      <SellerSettingsForm
        defaultValues={{
          shopName: seller.shopName,
          description: seller.description ?? '',
          contactEmail: seller.contactEmail ?? '',
          contactPhone: seller.contactPhone ?? '',
          inn: seller.inn ?? '',
          legalName: seller.legalName ?? '',
          legalAddress: seller.legalAddress ?? '',
          ogrn: seller.ogrn ?? '',
          bankAccount: seller.bankAccount ?? '',
          bik: seller.bik ?? '',
          bankName: seller.bankName ?? '',
        }}
      />
    </VStack>
  )
}
