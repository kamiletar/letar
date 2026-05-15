'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Gender } from '@/generated/prisma'
import {
  Accordion,
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Image,
  Switch,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useOptimistic, useTransition } from 'react'
import { FiEdit2, FiEye } from 'react-icons/fi'
import { LuSparkles } from 'react-icons/lu'
import { toggleNewCollection } from '../_actions/toggle-new-collection'

// Define types matching the data passed from page.tsx
interface VariantImage {
  url: string
  alt?: string | null
}

interface VariantItem {
  id: string
  price: string // Converted to string in page.tsx
  size: {
    international: string
  }
}

interface Variant {
  id: string
  color: string
  composition: string
  images: VariantImage[]
  items: VariantItem[]
}

interface Product {
  id: string
  name: string
  gender: Gender
  isNewCollection: boolean
  categoryName?: string | null
  createdAt: Date | string // Date object or string if serialized
  variants: Variant[]
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [, startTransition] = useTransition()
  const [optimisticIsNew, setOptimisticIsNew] = useOptimistic(product.isNewCollection)
  const createdAtDate = new Date(product.createdAt)

  const handleToggleNewCollection = (checked: boolean) => {
    startTransition(async () => {
      setOptimisticIsNew(checked)
      try {
        await toggleNewCollection(product.id, checked)
        toaster.success({
          title: checked ? 'Добавлено в новинки' : 'Удалено из новинок',
        })
      } catch (error) {
        toaster.error({
          title: 'Ошибка',
          description: error instanceof Error ? error.message : 'Не удалось изменить статус',
        })
      }
    })
  }

  // Format date safely to avoid hydration issues
  const formattedDate = createdAtDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Accordion.Root collapsible>
      <Accordion.Item value="variants" border="none">
        <Card.Root id={`product-${product.id}`}>
          <Card.Header>
            <VStack align="stretch" gap={3}>
              <HStack gap={{ base: 2, md: 4 }} align="start">
                {product.variants[0]?.images[0] && (
                  <Box
                    flexShrink={0}
                    width={{ base: '50px', md: '80px' }}
                    height={{ base: '50px', md: '80px' }}
                    borderRadius="md"
                    overflow="hidden"
                    bg="gray.100"
                  >
                    <Image
                      src={product.variants[0].images[0].url}
                      alt={product.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                )}
                <VStack align="stretch" flex="1" gap={2} minWidth="0">
                  {/* Title and Badge Row */}
                  <HStack gap={2} flexWrap="wrap">
                    <Heading size={{ base: 'md', md: 'lg' }} textTransform="none">
                      {product.name}
                    </Heading>
                    <Badge colorPalette={product.gender === Gender.MALE ? 'blue' : 'pink'} size="sm">
                      {product.gender === Gender.MALE ? 'Мужское' : 'Женское'}
                    </Badge>
                    {product.categoryName && (
                      <Badge colorPalette="cyan" size="sm" variant="subtle">
                        {product.categoryName}
                      </Badge>
                    )}
                    {optimisticIsNew && (
                      <Badge colorPalette="yellow" size="sm">
                        <LuSparkles size={12} />
                        Новинка
                      </Badge>
                    )}
                  </HStack>

                  {/* Metadata Row - responsive layout */}
                  <VStack align="stretch" gap={2} display={{ base: 'flex', md: 'none' }}>
                    <Text fontSize="xs" color="fg.muted">
                      ID: {product.id}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {formattedDate}
                    </Text>
                  </VStack>

                  <HStack gap={4} flexWrap="wrap" display={{ base: 'none', md: 'flex' }}>
                    <Text fontSize="sm" color="fg.muted" flexShrink={1}>
                      ID: {product.id} • Создан: {formattedDate}
                    </Text>

                    {product.variants.length > 0 && (
                      <Accordion.ItemTrigger asChild>
                        <Button size="sm" variant="ghost" colorPalette="gray" flexShrink={0}>
                          Варианты ({product.variants.length})
                          <Accordion.ItemIndicator />
                        </Button>
                      </Accordion.ItemTrigger>
                    )}
                  </HStack>
                </VStack>
              </HStack>

              {/* Action Buttons Row - Mobile Only */}
              <HStack gap={2} justify="flex-start" flexWrap="wrap" display={{ base: 'flex', md: 'none' }}>
                {product.variants.length > 0 && (
                  <Accordion.ItemTrigger asChild>
                    <Button size="sm" variant="ghost" colorPalette="gray" width="auto">
                      <Box display={{ base: 'none', sm: 'inline' }}>Варианты ({product.variants.length})</Box>
                      <Box display={{ base: 'inline', sm: 'none' }}>Вар. ({product.variants.length})</Box>
                      <Accordion.ItemIndicator />
                    </Button>
                  </Accordion.ItemTrigger>
                )}
                <Button asChild size="sm" colorPalette="fg">
                  <NextLink href={`/admin/products/${product.id}/edit`}>
                    <FiEdit2 />
                    <Box display={{ base: 'none', sm: 'inline' }}>Редактировать</Box>
                    <Box display={{ base: 'inline', sm: 'none' }}>Ред.</Box>
                  </NextLink>
                </Button>
                <Button asChild size="sm" variant="ghost" colorPalette="gray">
                  <NextLink href={`/catalog/${product.id}`}>
                    <FiEye />
                    <Box display={{ base: 'none', sm: 'inline' }}>Просмотр</Box>
                  </NextLink>
                </Button>
                <HStack gap={2} ml="auto">
                  <Text fontSize="xs" color="fg.muted">
                    Новинка
                  </Text>
                  <Switch.Root
                    checked={optimisticIsNew}
                    onCheckedChange={(e) => handleToggleNewCollection(e.checked)}
                    size="sm"
                    colorPalette="yellow"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </HStack>
              </HStack>

              {/* Action Buttons Row - Desktop Only */}
              <HStack gap={2} justify="flex-start" display={{ base: 'none', md: 'flex' }}>
                <Button asChild size="sm" colorPalette="fg">
                  <NextLink href={`/admin/products/${product.id}/edit`}>
                    <FiEdit2 />
                    Редактировать
                  </NextLink>
                </Button>
                <Button asChild size="sm" variant="ghost" colorPalette="gray">
                  <NextLink href={`/catalog/${product.id}`}>
                    <FiEye />
                    Просмотр
                  </NextLink>
                </Button>
                <HStack gap={2} ml={4} pl={4} borderLeftWidth="1px" borderColor="border">
                  <Text fontSize="sm" color="fg.muted">
                    Новинка
                  </Text>
                  <Switch.Root
                    checked={optimisticIsNew}
                    onCheckedChange={(e) => handleToggleNewCollection(e.checked)}
                    size="sm"
                    colorPalette="yellow"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </HStack>
              </HStack>
            </VStack>
          </Card.Header>
          <Card.Body>
            <Accordion.ItemContent pb={4} px={0}>
              {product.variants.length === 0 ? (
                <Text color="fg.muted" fontSize="sm">
                  Нет вариантов
                </Text>
              ) : (
                <VStack gap={4} align="stretch">
                  {product.variants.map((variant) => (
                    <Box key={variant.id} borderWidth="1px" borderColor="border" borderRadius="md" p={4}>
                      <Box display="flex" gap={4} alignItems="start" flexWrap="wrap">
                        {/* Variant Image */}
                        {variant.images[0] && (
                          <Box
                            flexShrink={0}
                            width="80px"
                            height="80px"
                            borderRadius="md"
                            overflow="hidden"
                            bg="gray.100"
                          >
                            <Image
                              src={variant.images[0].url}
                              alt={variant.images[0].alt || `${product.name} - ${variant.color}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </Box>
                        )}

                        {/* Variant Details */}
                        <Box flex="1" minWidth="200px">
                          <Text fontWeight="semibold" mb={2}>
                            Вариант: {variant.color}
                          </Text>
                          <Text fontSize="sm" color="fg.muted" mb={2}>
                            Состав: {variant.composition}
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            ID: {variant.id}
                          </Text>

                          {/* Items/Sizes Table */}
                          {variant.items.length > 0 && (
                            <Box mt={3}>
                              <Table.Root size="sm" variant="outline">
                                <Table.Header>
                                  <Table.Row>
                                    <Table.ColumnHeader>Размер</Table.ColumnHeader>
                                    <Table.ColumnHeader>Цена</Table.ColumnHeader>
                                  </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                  {variant.items.map((item) => (
                                    <Table.Row key={item.id}>
                                      <Table.Cell>
                                        <Badge size="sm" colorPalette="fg">
                                          {item.size.international}
                                        </Badge>
                                      </Table.Cell>
                                      <Table.Cell>
                                        <Text fontWeight="medium" fontFamily="mono">
                                          {Number(item.price).toLocaleString('ru-RU', {
                                            style: 'currency',
                                            currency: 'RUB',
                                          })}
                                        </Text>
                                      </Table.Cell>
                                    </Table.Row>
                                  ))}
                                </Table.Body>
                              </Table.Root>
                            </Box>
                          )}

                          {/* Image count */}
                          {variant.images.length > 0 && (
                            <Text fontSize="xs" color="fg.muted" mt={2}>
                              Изображений: {variant.images.length}
                            </Text>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </VStack>
              )}
            </Accordion.ItemContent>
            {product.variants.length === 0 && (
              <Text color="fg.muted" fontSize="sm">
                Нет вариантов
              </Text>
            )}
          </Card.Body>
        </Card.Root>
      </Accordion.Item>
    </Accordion.Root>
  )
}
