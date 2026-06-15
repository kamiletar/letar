import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Box, Heading } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { updateClientAction } from '../../_actions/client.action'
import { ClientForm } from '../../_components/client-form'

export const metadata: Metadata = { title: 'Редактировать клиент' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: Props) {
  await requireAdmin()

  const { id } = await params

  const client = await prisma.oauthApplication.findFirst({
    where: { clientId: id },
  })

  if (!client) {notFound()}

  async function handleUpdate(formData: FormData) {
    'use server'
    return updateClientAction(id, formData)
  }

  return (
    <Box maxW="2xl" mx="auto" p={6}>
      <Heading size="xl" mb={6}>
        Редактировать: {client.name}
      </Heading>

      <ClientForm
        mode="edit"
        lockedClientId={client.clientId}
        defaultValues={{
          name: client.name ?? '',
          redirectUrls: client.redirectUrls,
          type: (client.type as 'web' | 'native' | 'spa') ?? 'web',
          skipConsent: client.skipConsent ?? false,
          disabled: client.disabled ?? false,
        }}
        onSubmit={handleUpdate}
        successRedirect={`/admin/clients/${id}`}
      />
    </Box>
  )
}
