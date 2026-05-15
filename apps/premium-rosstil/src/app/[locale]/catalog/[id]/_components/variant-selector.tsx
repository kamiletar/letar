'use client'

import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'

interface VariantSelectorProps {
  variants: Array<{
    id: string
    color: string
    composition: string
    images: Array<{
      id: string
      url: string
      alt: string | null
      order: number
    }>
  }>
  selectedVariantId: string
  onSelectVariant: (variantId: string) => void
}

export function VariantSelector({ variants, selectedVariantId, onSelectVariant }: VariantSelectorProps) {
  return (
    <HStack gap={4} wrap="wrap">
      {variants.map((variant) => {
        const isSelected = variant.id === selectedVariantId
        const firstImage = variant.images[0]

        return (
          <VStack
            key={variant.id}
            gap={2}
            cursor="pointer"
            role="button"
            tabIndex={0}
            aria-label={`Цвет: ${variant.color}`}
            aria-pressed={isSelected}
            onClick={() => onSelectVariant(variant.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectVariant(variant.id)
              }
            }}
            transition="all 0.2s"
            opacity={isSelected ? 1 : 0.7}
            _hover={{
              opacity: 1,
            }}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'fg',
              outlineOffset: '2px',
              borderRadius: 'md',
            }}
          >
            <Box
              position="relative"
              width="80px"
              height="100px"
              borderRadius="md"
              borderWidth="3px"
              borderColor={isSelected ? 'fg' : 'border'}
              overflow="hidden"
              transition="all 0.2s"
              _hover={{
                borderColor: 'fg',
              }}
            >
              {firstImage ? (
                <Image
                  src={firstImage.url}
                  alt={firstImage.alt || variant.color}
                  fill
                  sizes="80px"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <Box
                  width="100%"
                  height="100%"
                  bg="gray.100"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="xs" color="fg.muted">
                    Нет фото
                  </Text>
                </Box>
              )}
            </Box>
            <Text
              fontSize="sm"
              fontWeight={isSelected ? 'semibold' : 'normal'}
              color={isSelected ? 'fg' : 'fg.muted'}
              textAlign="center"
            >
              {variant.color}
            </Text>
          </VStack>
        )
      })}
    </HStack>
  )
}
