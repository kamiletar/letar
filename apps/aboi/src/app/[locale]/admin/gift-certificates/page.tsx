import { Heading, Stack } from '@chakra-ui/react'
import { prismaAuth } from '@/lib/prisma'
import { CertificatesManager } from './_components/certificates-manager'

export default async function AdminCertificatesPage() {
  const certs = await prismaAuth.giftCertificate.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <Stack gap={6}>
      <Heading as="h1" size="2xl">
        Подарочные сертификаты
      </Heading>
      <CertificatesManager
        certificates={certs.map((c) => ({
          id: c.id,
          code: c.code,
          initialAmount: c.initialAmount,
          currentBalance: c.currentBalance,
          issuedToEmail: c.issuedToEmail,
          expiresAt: c.expiresAt.toISOString().slice(0, 10),
          isActive: c.isActive,
        }))}
      />
    </Stack>
  )
}
