'use client'

import { subscribeToNewsletter } from '@/app/_actions/newsletter'
import { toaster } from '@/app/_components/ui/toaster'
import { Button, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { FiMail } from 'react-icons/fi'

/** Форма подписки на рассылку в футере */
export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      return
    }

    startTransition(async () => {
      const result = await subscribeToNewsletter({ email: email.trim() })

      if (result.success) {
        setIsSubscribed(true)
        setEmail('')
        toaster.success({ title: 'Вы подписаны на рассылку!' })
      } else {
        toaster.error({ title: result.error || 'Ошибка подписки' })
      }
    })
  }

  if (isSubscribed) {
    return (
      <VStack gap={2}>
        <Text fontSize="sm" color="whiteAlpha.800">
          Спасибо за подписку!
        </Text>
      </VStack>
    )
  }

  return (
    <VStack gap={2} as="form" onSubmit={handleSubmit}>
      <Text fontSize="sm" fontWeight="semibold" color="whiteAlpha.900">
        Подпишитесь на новости
      </Text>
      <HStack gap={2} width="100%">
        <Input
          placeholder="Ваш email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          size="sm"
          bg="whiteAlpha.200"
          borderColor="whiteAlpha.300"
          color="white"
          _placeholder={{ color: 'whiteAlpha.500' }}
          required
        />
        <Button type="submit" size="sm" colorPalette="fg" loading={isPending} flexShrink={0}>
          <FiMail />
        </Button>
      </HStack>
    </VStack>
  )
}
