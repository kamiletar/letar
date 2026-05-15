'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Container, Heading, Input, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuCalendar } from 'react-icons/lu'

/**
 * Дозаполнение профиля — дата рождения
 *
 * Показывается после OAuth входа если birthDate не заполнен.
 * Необходимо для возрастной фильтрации каталога.
 */
export default function CompleteProfilePage() {
  const router = useRouter()
  const [birthDate, setBirthDate] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!birthDate) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/user/birth-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ошибка сохранения')
      }

      router.push('/anime')
      router.refresh()
    } catch (err) {
      toaster.error({
        title: 'Ошибка',
        description: err instanceof Error ? err.message : 'Попробуйте ещё раз',
      })
    } finally {
      setLoading(false)
    }
  }

  // Максимальная дата — сегодня
  const today = new Date().toISOString().split('T')[0]

  return (
    <Box minH="100vh" bg="bg" display="flex" alignItems="center">
      <Container maxW="400px">
        <VStack gap={6}>
          <VStack gap={2} textAlign="center">
            <LuCalendar size={32} />
            <Heading size="lg">Укажите дату рождения</Heading>
            <Text color="fg.muted" fontSize="sm">
              Это нужно для корректного отображения каталога. Некоторый контент имеет возрастные ограничения.
            </Text>
          </VStack>

          <Box as="form" onSubmit={handleSubmit} w="100%">
            <VStack gap={4}>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={today}
                min="1920-01-01"
                required
              />
              <Button type="submit" colorPalette="brand" w="100%" loading={loading}>
                Продолжить
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/anime')} color="fg.muted">
                Пропустить (каталог будет ограничен)
              </Button>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
