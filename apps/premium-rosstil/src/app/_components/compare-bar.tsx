'use client'

import { useCompare } from '@/hooks/use-compare'
import { Link } from '@/i18n/navigation'
import { Badge, Box, Button, Circle, HStack, Icon, IconButton, Image, Text, VStack } from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import { FaBalanceScale, FaTimes, FaTrash } from 'react-icons/fa'

/**
 * Плавающая панель сравнения товаров.
 * Показывается когда есть хотя бы один товар в сравнении.
 */
export function CompareBar() {
  const { items, count, removeFromCompare, clearCompare, isLoading } = useCompare()

  if (isLoading || count === 0) {
    return null
  }

  return (
    <Box
      position="fixed"
      bottom={4}
      left="50%"
      transform="translateX(-50%)"
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border.muted"
      borderRadius="xl"
      shadow="xl"
      p={3}
      zIndex={1000}
      maxW="90vw"
    >
      <VStack gap={2}>
        {/* Заголовок */}
        <HStack justify="space-between" w="full">
          <HStack gap={2}>
            <Icon as={FaBalanceScale} color="fg.muted" />
            <Text fontSize="sm" fontWeight="medium">
              Сравнение
            </Text>
            <Badge colorPalette="fg" size="sm">
              {count}/4
            </Badge>
          </HStack>
          <Tooltip content="Очистить всё">
            <IconButton
              aria-label="Очистить сравнение"
              variant="ghost"
              size="xs"
              colorPalette="red"
              onClick={clearCompare}
            >
              <Icon as={FaTrash} />
            </IconButton>
          </Tooltip>
        </HStack>

        {/* Миниатюры товаров */}
        <HStack gap={2}>
          {items.map((item) => (
            <Box key={item.variantId} position="relative">
              <Tooltip content={`${item.productName} (${item.variantColor})`} positioning={{ placement: 'top' }}>
                <Box
                  w={14}
                  h={14}
                  borderRadius="md"
                  overflow="hidden"
                  borderWidth="1px"
                  borderColor="border.muted"
                  bg="bg.subtle"
                >
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.productName} w="full" h="full" objectFit="cover" />
                  ) : (
                    <Circle size="full" bg="bg.muted">
                      <Icon as={FaBalanceScale} color="fg.muted" />
                    </Circle>
                  )}
                </Box>
              </Tooltip>
              {/* Кнопка удаления */}
              <IconButton
                aria-label="Удалить"
                position="absolute"
                top={-1}
                right={-1}
                size="2xs"
                variant="solid"
                colorPalette="gray"
                borderRadius="full"
                onClick={() => removeFromCompare(item.variantId)}
              >
                <Icon as={FaTimes} boxSize={2} />
              </IconButton>
            </Box>
          ))}

          {/* Пустые слоты */}
          {Array.from({ length: 4 - count }).map((_, i) => (
            <Box
              key={`empty-${i}`}
              w={14}
              h={14}
              borderRadius="md"
              borderWidth="1px"
              borderStyle="dashed"
              borderColor="border.muted"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="xs" color="fg.subtle">
                +
              </Text>
            </Box>
          ))}
        </HStack>

        {/* Кнопка перехода к сравнению */}
        <Button asChild colorPalette="fg" size="sm" w="full">
          <Link href="/compare">Сравнить товары</Link>
        </Button>
      </VStack>
    </Box>
  )
}
