'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { Badge, Button, Card, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { FaEdit, FaRegStar, FaTrash } from 'react-icons/fa'
import { deleteAddress } from '../_actions/delete-address'
import { setDefaultAddress } from '../_actions/set-default-address'

interface AddressCardProps {
  address: {
    id: string
    label: string
    fullAddress: string
    entrance?: string | null
    floor?: string | null
    flat?: string | null
    recipientName: string
    phone: string
    isDefault: boolean
  }
}

/**
 * Карточка адреса для отображения в списке.
 * Показывает информацию об адресе и кнопки управления.
 */
export function AddressCard({ address }: AddressCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSettingDefault, setIsSettingDefault] = useState(false)

  const handleDelete = async () => {
    if (isDeleting) {
      return
    }
    if (!window.confirm('Вы уверены, что хотите удалить этот адрес?')) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteAddress(address.id)
      toaster.success({
        title: 'Адрес удален',
        description: address.label,
      })
    } catch {
      toaster.error({
        title: 'Ошибка',
        description: 'Не удалось удалить адрес',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSetDefault = async () => {
    if (isSettingDefault || address.isDefault) {
      return
    }

    setIsSettingDefault(true)
    try {
      await setDefaultAddress(address.id)
      toaster.success({
        title: 'Адрес установлен по умолчанию',
      })
    } catch {
      toaster.error({
        title: 'Ошибка',
        description: 'Не удалось установить адрес по умолчанию',
      })
    } finally {
      setIsSettingDefault(false)
    }
  }

  const handleEdit = () => {
    router.push(`/profile/addresses/${address.id}/edit`)
  }

  return (
    <Card.Root>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          {/* Заголовок с меткой и бейджем "По умолчанию" */}
          <HStack justify="space-between" align="start">
            <VStack align="start" gap={1}>
              <HStack>
                <Text fontSize="lg" fontWeight="semibold">
                  {address.label}
                </Text>
                {address.isDefault && (
                  <Badge colorPalette="green" size="sm">
                    По умолчанию
                  </Badge>
                )}
              </HStack>
              <Text fontSize="sm" color="fg.muted">
                {address.fullAddress}
              </Text>
              {(address.entrance || address.floor || address.flat) && (
                <Text fontSize="xs" color="fg.muted">
                  {[
                    address.entrance && `Подъезд ${address.entrance}`,
                    address.floor && `Этаж ${address.floor}`,
                    address.flat && `Кв. ${address.flat}`,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              )}
            </VStack>
          </HStack>

          {/* Информация о получателе */}
          <VStack align="start" gap={1}>
            <Text fontSize="sm" color="fg.muted">
              Получатель:
            </Text>
            <Text fontWeight="medium">{address.recipientName}</Text>
            <Text fontSize="sm" color="fg.muted">
              {address.phone}
            </Text>
          </VStack>

          {/* Кнопки управления */}
          <HStack justify="flex-end" borderTopWidth="1px" pt={4}>
            {!address.isDefault && (
              <Button
                size="sm"
                variant="outline"
                colorPalette="fg"
                onClick={handleSetDefault}
                loading={isSettingDefault}
              >
                <FaRegStar />
                Сделать основным
              </Button>
            )}

            <IconButton
              aria-label="Редактировать адрес"
              size="sm"
              variant="outline"
              colorPalette="fg"
              onClick={handleEdit}
            >
              <FaEdit />
            </IconButton>

            <IconButton
              aria-label="Удалить адрес"
              size="sm"
              variant="outline"
              colorPalette="red"
              onClick={handleDelete}
              loading={isDeleting}
            >
              <FaTrash />
            </IconButton>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
