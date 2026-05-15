import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { CompanyProfileForm } from './_components/company-profile-form'

export const metadata = {
  title: 'Профиль компании — Премиум РосСтиль',
  description: 'Редактирование реквизитов компании для B2B заказов',
}

export default async function CompanyProfilePage() {
  const authUser = await requireAuth()

  const db = getEnhancedPrisma(authUser)

  // Get existing company profile
  const companyProfile = await db.companyProfile.findUnique({
    where: { userId: authUser.id },
  })

  return (
    <VStack align="stretch" gap={6}>
      <HStack justify="space-between" wrap="wrap">
        <VStack align="start" gap={1}>
          <Heading size="2xl" textTransform="none">
            Профиль компании
          </Heading>
          <Text color="fg.muted">Данные для оформления B2B заказов</Text>
        </VStack>
        {companyProfile && (
          <Badge colorPalette="green" size="lg">
            Заполнен
          </Badge>
        )}
      </HStack>

      <Card.Root>
        <Card.Body>
          <CompanyProfileForm
            defaultValue={{
              companyName: companyProfile?.companyName,
              companyINN: companyProfile?.companyINN,
              companyAddress: companyProfile?.companyAddress,
              contactPerson: companyProfile?.contactPerson,
              companyPhone: companyProfile?.companyPhone,
              companyEmail: companyProfile?.companyEmail,
            }}
          />
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
