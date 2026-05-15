'use client'

import { Link } from '@/i18n/navigation'
import { Badge, Box, Button, HStack, RadioGroup, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { FaPlus } from 'react-icons/fa'

interface SavedAddress {
  id: string
  label: string
  fullAddress: string
  recipientName: string
  phone: string
  isDefault: boolean
  postalCode: string | null
  city: string | null
  region: string | null
}

interface SavedAddressSelectorProps {
  addresses: SavedAddress[]
  onAddressSelect: (address: SavedAddress | null) => void
}

/**
 * Компонент для выбора сохраненного адреса при оформлении заказа.
 * Отображает список сохраненных адресов и позволяет выбрать один из них или ввести новый.
 */
export function SavedAddressSelector({ addresses, onAddressSelect }: SavedAddressSelectorProps) {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    // По умолчанию выбираем адрес по умолчанию, если он есть
    addresses.find((addr) => addr.isDefault)?.id || null
  )

  const handleAddressChange = (value: string) => {
    if (value === 'new') {
      setSelectedAddressId(null)
      onAddressSelect(null)
    } else {
      setSelectedAddressId(value)
      const selectedAddress = addresses.find((addr) => addr.id === value)
      if (selectedAddress) {
        onAddressSelect(selectedAddress)
      }
    }
  }

  if (addresses.length === 0) {
    return (
      <Box borderWidth="1px" borderRadius="lg" p={4} bg="bg.subtle" textAlign="center">
        <Text fontSize="sm" color="fg.muted" mb={3}>
          У вас пока нет сохраненных адресов
        </Text>
        <Button asChild size="sm" variant="outline" colorPalette="fg">
          <Link href="/profile/addresses/new">
            <FaPlus />
            Добавить адрес
          </Link>
        </Button>
      </Box>
    )
  }

  return (
    <VStack align="stretch" gap={4}>
      <HStack justify="space-between">
        <Text fontSize="md" fontWeight="medium">
          Сохраненные адреса
        </Text>
        <Button asChild size="sm" variant="ghost" colorPalette="fg">
          <Link href="/profile/addresses">Управление адресами</Link>
        </Button>
      </HStack>

      <RadioGroup.Root
        value={selectedAddressId || 'new'}
        onValueChange={(e) => e.value && handleAddressChange(e.value)}
        colorPalette="fg"
      >
        <VStack align="stretch" gap={3}>
          {addresses.map((address) => (
            <Box
              key={address.id}
              borderWidth="1px"
              borderRadius="md"
              p={3}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ borderColor: 'fg.500' }}
              bg={selectedAddressId === address.id ? 'fg.50' : 'bg'}
              borderColor={selectedAddressId === address.id ? 'fg.500' : 'border'}
              onClick={() => handleAddressChange(address.id)}
            >
              <RadioGroup.Item value={address.id}>
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemControl />
                <RadioGroup.ItemText>
                  <VStack align="start" gap={1} ml={2}>
                    <HStack>
                      <Text fontWeight="medium" fontSize="sm">
                        {address.label}
                      </Text>
                      {address.isDefault && (
                        <Badge colorPalette="green" size="sm">
                          По умолчанию
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="fg.muted">
                      {address.fullAddress}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {address.recipientName} • {address.phone}
                    </Text>
                  </VStack>
                </RadioGroup.ItemText>
              </RadioGroup.Item>
            </Box>
          ))}

          {/* Опция "Ввести новый адрес" */}
          <Box
            borderWidth="1px"
            borderRadius="md"
            p={3}
            cursor="pointer"
            transition="all 0.2s"
            _hover={{ borderColor: 'fg.500' }}
            bg={selectedAddressId === null ? 'fg.50' : 'bg'}
            borderColor={selectedAddressId === null ? 'fg.500' : 'border'}
            onClick={() => handleAddressChange('new')}
          >
            <RadioGroup.Item value="new">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl />
              <RadioGroup.ItemText>
                <Text fontWeight="medium" fontSize="sm" ml={2}>
                  Ввести новый адрес
                </Text>
              </RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
        </VStack>
      </RadioGroup.Root>
    </VStack>
  )
}
