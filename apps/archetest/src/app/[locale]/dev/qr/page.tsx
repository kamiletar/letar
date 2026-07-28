'use client'

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'

/**
 * Print-friendly QR-коды для раздатки на фесте (этап 5.7): экспресс-тест и
 * страница для психологов. Только для разработки — печатается локально
 * перед мероприятием, в production роут не открывается.
 */
export default function QrDevPage() {
  const params = useParams<{ locale: string }>()
  const locale = params.locale ?? 'ru'
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const targets = [
    { label: 'Экспресс-тест', path: `/${locale}/express` },
    { label: 'Для психологов', path: `/${locale}/for-professionals` },
  ]

  return (
    <Container maxW="3xl" py={10} bg="white" color="black">
      <VStack gap={10}>
        <Heading size="lg">QR-коды для раздатки</Heading>
        {origin
          ? targets.map((target) => {
              const url = `${origin}${target.path}`
              return (
                <VStack key={target.path} gap={3}>
                  <Text fontWeight="bold" fontSize="lg">
                    {target.label}
                  </Text>
                  <Box p={4} bg="white" borderWidth="1px" borderColor="black">
                    <QRCodeSVG value={url} size={240} level="M" />
                  </Box>
                  <Text fontSize="sm" fontFamily="mono">
                    {url}
                  </Text>
                </VStack>
              )
            })
          : null}
      </VStack>
    </Container>
  )
}
