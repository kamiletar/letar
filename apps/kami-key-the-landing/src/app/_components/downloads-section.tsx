'use client'

import { Box, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { FaWindows } from 'react-icons/fa6'
import { LuDownload, LuTriangleAlert } from 'react-icons/lu'

/**
 * Секция скачивания — карточка с информацией о загрузке
 * Server Component (нет интерактивности)
 */
export function DownloadsSection() {
  return (
    <Box as="section" id="downloads" py={{ base: 16, md: 24 }}>
      <Container maxW="4xl" px={{ base: 4, md: 8 }}>
        <VStack gap={{ base: 8, md: 12 }}>
          {/* Заголовок */}
          <VStack gap={3} textAlign="center">
            <Heading as="h2" className="gradient-text font-mono" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="700">
              Скачать
            </Heading>
            <Text color="gray.400" fontSize={{ base: 'sm', md: 'md' }}>
              Бесплатно. Без рекламы. Без регистрации.
            </Text>
          </VStack>

          {/* Карточка Windows */}
          <Box
            className="glass"
            borderRadius="2xl"
            p={{ base: 6, md: 8 }}
            maxW="md"
            w="100%"
            mx="auto"
            border="1px solid rgba(57, 255, 20, 0.2)"
            transition="all 0.3s ease"
            _hover={{
              borderColor: 'rgba(57, 255, 20, 0.4)',
              boxShadow: '0 0 40px rgba(57, 255, 20, 0.1)',
            }}
          >
            <VStack gap={5} align="center">
              {/* Иконка Windows */}
              <Box p={4} borderRadius="xl" bg="rgba(57, 255, 20, 0.06)" border="1px solid rgba(57, 255, 20, 0.15)">
                <FaWindows size={40} color="#4dff7a" />
              </Box>

              {/* Название и версия */}
              <VStack gap={1}>
                <Text className="font-mono" fontSize="xl" fontWeight="700" color="gray.50">
                  Windows 10+
                </Text>
                <HStack gap={3} color="gray.500" fontSize="xs" className="font-mono">
                  <Text>v1.2.0</Text>
                  <Text>{'\u00B7'}</Text>
                  <Text>~85 MB</Text>
                  <Text>{'\u00B7'}</Text>
                  <Text>Electron</Text>
                </HStack>
              </VStack>

              {/* Кнопка скачивания (заглушка) */}
              <button
                disabled
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: 'rgba(57, 255, 20, 0.15)',
                  color: '#718096',
                  fontWeight: 600,
                  fontSize: '14px',
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: 'not-allowed',
                  border: '1px solid rgba(57, 255, 20, 0.2)',
                  opacity: 0.6,
                }}
                aria-label="Скачать .exe (скоро будет доступно)"
              >
                <LuDownload size={16} />
                Скачать .exe
                <Box
                  as="span"
                  px={2}
                  py={0.5}
                  borderRadius="full"
                  bg="rgba(57, 255, 20, 0.1)"
                  color="brand.400"
                  fontSize="xs"
                >
                  Скоро
                </Box>
              </button>

              {/* Предупреждение SmartScreen */}
              <Box
                w="100%"
                p={3}
                borderRadius="lg"
                bg="rgba(255, 200, 0, 0.05)"
                border="1px solid rgba(255, 200, 0, 0.15)"
              >
                <HStack align="start" gap={2}>
                  <Box flexShrink={0} mt="2px">
                    <LuTriangleAlert size={16} color="#ECC94B" />
                  </Box>
                  <Text fontSize="xs" color="gray.400" lineHeight="tall">
                    Приложение не подписано. Windows SmartScreen может показать предупреждение {'\u2014'} нажмите{' '}
                    {'\u00AB'}Подробнее{'\u00BB'} {'\u2192'} {'\u00AB'}Выполнить в любом случае{'\u00BB'}.
                  </Text>
                </HStack>
              </Box>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
