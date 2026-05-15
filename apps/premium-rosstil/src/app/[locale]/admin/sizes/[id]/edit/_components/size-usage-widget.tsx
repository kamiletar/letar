'use client'

import { Badge, Box, Card, Heading, Link, List, Skeleton, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useEffect, useState } from 'react'
import { getSizeUsage, type SizeUsageInfo } from '../_actions/get-size-usage'

interface SizeUsageWidgetProps {
  sizeId: string
  sizeName: string
}

/**
 * Widget that displays products using this size.
 * Shows usage count, product list with links, and status badge.
 */
export function SizeUsageWidget({ sizeId, sizeName }: SizeUsageWidgetProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usageInfo, setUsageInfo] = useState<{
    isUsed: boolean
    items: SizeUsageInfo[]
    count: number
  } | null>(null)

  // Load usage info on mount
  useEffect(() => {
    let mounted = true

    // Use async function to avoid calling setState directly in effect
    const loadUsageInfo = async () => {
      try {
        const info = await getSizeUsage(sizeId)
        if (mounted) {
          setUsageInfo(info)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить информацию об использовании')
          setIsLoading(false)
        }
      }
    }

    setIsLoading(true)
    loadUsageInfo()

    return () => {
      mounted = false
    }
  }, [sizeId])

  /**
   * Pluralize Russian word based on count
   */
  function pluralize(count: number, one: string, few: string, many: string): string {
    const mod10 = count % 10
    const mod100 = count % 100

    if (mod10 === 1 && mod100 !== 11) {
      return one
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return few
    }
    return many
  }

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md" textTransform="none">
          Использование размера
        </Heading>
      </Card.Header>
      <Card.Body>
        {isLoading && (
          <VStack gap={2} align="stretch">
            <Skeleton height="20px" />
            <Skeleton height="20px" />
            <Skeleton height="20px" />
          </VStack>
        )}

        {error && (
          <Box p={3} bg="red.subtle" borderWidth="1px" borderColor="red.solid" borderRadius="md">
            <Text fontSize="sm" color="red.fg">
              {error}
            </Text>
          </Box>
        )}

        {!isLoading && !error && usageInfo && (
          <VStack gap={4} align="stretch">
            {/* Status badge */}
            <Box>
              {usageInfo.isUsed ? (
                <Badge colorPalette="green" size="lg">
                  Используется в {usageInfo.count} {pluralize(usageInfo.count, 'товаре', 'товарах', 'товарах')}
                </Badge>
              ) : (
                <Badge colorPalette="gray" size="lg" variant="subtle">
                  Размер не используется ни в одном товаре
                </Badge>
              )}
            </Box>

            {/* Product list */}
            {usageInfo.isUsed && (
              <>
                <Text fontSize="sm" color="fg.muted">
                  Товары с размером <strong>{sizeName}</strong>:
                </Text>

                <Box maxH="400px" overflowY="auto" borderWidth="1px" borderRadius="md" p={3} bg="bg.muted">
                  <List.Root gap={3} variant="plain">
                    {usageInfo.items.map((item) => (
                      <List.Item key={item.itemId}>
                        <Box>
                          <Link asChild color="fg" fontWeight="medium">
                            <NextLink href={`/admin/products#product-${item.productId}`}>{item.productName}</NextLink>
                          </Link>
                          <Text fontSize="sm" color="fg.muted" mt={1}>
                            Цвет: <strong>{item.variantColor}</strong> • Состав: {item.variantComposition}
                          </Text>
                          <Text fontSize="sm" color="fg.muted">
                            Цена: <strong>{item.itemPrice} ₽</strong>
                            {item.itemAvailable > 0 && ` • В наличии: ${item.itemAvailable} шт.`}
                          </Text>
                        </Box>
                      </List.Item>
                    ))}
                  </List.Root>
                </Box>

                <Box p={3} bg="blue.subtle" borderRadius="md" borderWidth="1px" borderColor="blue.solid">
                  <Text fontSize="sm" color="blue.fg">
                    💡 <strong>Совет:</strong> Для изменения или удаления размера в товаре перейдите к странице товара,
                    нажав на его название.
                  </Text>
                </Box>
              </>
            )}

            {/* Empty state with helpful message */}
            {!usageInfo.isUsed && (
              <Box p={3} bg="gray.subtle" borderRadius="md" borderWidth="1px" borderColor="gray.solid">
                <Text fontSize="sm" color="fg.muted">
                  Этот размер можно безопасно удалить, так как он не используется ни в одном товаре. Или вы можете
                  добавить товары с этим размером на странице{' '}
                  <Link asChild color="fg" fontWeight="medium">
                    <NextLink href="/admin/products">управления товарами</NextLink>
                  </Link>
                  .
                </Text>
              </Box>
            )}
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  )
}
