'use client'

import { Box, Button, Container, Heading, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import Script from 'next/script'
import { useEffect, useState } from 'react'

import { ColorModeButton } from '@/app/_components/ui/color-mode'

export default function ApiDocsPage() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Инициализируем Swagger UI когда скрипт загружен
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    if (isLoaded && typeof window !== 'undefined' && win.SwaggerUIBundle) {
      const SwaggerUIBundle = win.SwaggerUIBundle
      SwaggerUIBundle({
        url: '/api/openapi',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        deepLinking: true,
        // Скрываем topbar с логотипом Swagger
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        // Настройки авторизации по умолчанию
        persistAuthorization: true,
      })
    }
  }, [isLoaded])

  return (
    <>
      {/* Swagger UI CSS */}
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />

      {/* Swagger UI JS */}
      <Script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" onLoad={() => setIsLoaded(true)} />

      <Container maxW="container.xl" py={4} position="relative">
        {/* Шапка */}
        <Stack direction="row" justify="space-between" align="center" mb={4}>
          <Box>
            <Heading size="lg">API Documentation</Heading>
            <Text color="fg.muted" fontSize="sm">
              Интерактивная документация Public API
            </Text>
          </Box>
          <Stack direction="row" gap={2}>
            <Button asChild variant="ghost" size="sm">
              <Link href="/developers">Руководство</Link>
            </Button>
            <ColorModeButton />
          </Stack>
        </Stack>

        {/* Swagger UI контейнер */}
        <Box
          id="swagger-ui"
          borderRadius="md"
          overflow="hidden"
          minH="80vh"
          css={{
            // Стили для тёмной темы
            '& .swagger-ui': {
              fontFamily: 'inherit',
            },
            '& .swagger-ui .topbar': {
              display: 'none',
            },
          }}
        />
      </Container>
    </>
  )
}
