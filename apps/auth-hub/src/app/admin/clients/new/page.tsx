'use client'

import { Box, Heading } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClientAction } from '../_actions/client.action'
import { ClientForm } from '../_components/client-form'
import { RisksConsent } from '../_components/risks-consent'

/**
 * Создание нового OIDC-клиента.
 * Стадия 1: экран рисков. Стадия 2: форма создания.
 */
export default function NewClientPage() {
  const router = useRouter()
  const [stage, setStage] = useState<'risks' | 'form'>('risks')

  async function handleCreate(formData: FormData) {
    const result = await createClientAction(formData)
    if ('error' in result) {
      return result
    }
    // Redirect на детальную страницу с secret в search params
    router.push(`/admin/clients/${result.clientId}?secret=${encodeURIComponent(result.secret)}`)
    return result
  }

  return (
    <Box maxW="3xl" mx="auto" p={6}>
      <Heading size="xl" mb={6}>
        Новый OAuth-клиент
      </Heading>

      {stage === 'risks'
        ? <RisksConsent onAccept={() => setStage('form')} />
        : <ClientForm mode="create" onSubmit={handleCreate} />}
    </Box>
  )
}
