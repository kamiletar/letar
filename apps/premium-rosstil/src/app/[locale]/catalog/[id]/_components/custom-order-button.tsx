'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { Gender } from '@/generated/prisma'
import { useRouter } from '@/i18n/navigation'
import {
  Button,
  DialogActionTrigger,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FaShoppingBag } from 'react-icons/fa'
import { B2BPartnershipOrderForm } from './b2b-partnership-order-form'
import { CustomDesignOrderForm } from './custom-design-order-form'
import { MadeToOrderForm } from './made-to-order-form'

interface VariantSizeItem {
  id: string
  price: number
  size: {
    id: string
    gender: Gender
    international: string
  }
}

interface AllSizeItem {
  id: string
  gender: Gender
  international: string
  sortOrder: number
}

interface UserMeasurements {
  bust: number | null
  waist: number | null
  hips: number | null
  height: number | null
  gender: string
}

interface UserContactInfo {
  name: string | null
  email: string
  phone: string | null
}

interface CompanyProfile {
  companyName: string
  companyINN: string | null
  companyAddress: string | null
  contactPerson: string | null
  companyPhone: string | null
  companyEmail: string | null
}

interface CustomOrderButtonProps {
  productId: string
  variantId?: string
  productItemId?: string
  availableSizes: VariantSizeItem[]
  /** Все размеры для данного пола */
  allSizes: AllSizeItem[]
  isAuthenticated: boolean
  userMeasurements: UserMeasurements | null
  /** Контактные данные пользователя для предзаполнения форм */
  userContactInfo: UserContactInfo | null
  companyProfile: CompanyProfile | null
}

type OrderType = 'made-to-order' | 'custom-design' | 'b2b-partnership' | null

export function CustomOrderButton({
  productId,
  variantId,
  productItemId,
  availableSizes,
  allSizes,
  isAuthenticated,
  userMeasurements,
  userContactInfo,
  companyProfile,
}: CustomOrderButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<OrderType>(null)

  const handleOpenDialog = () => {
    if (!isAuthenticated) {
      const currentUrl = window.location.pathname + window.location.search
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`)
      toaster.create({
        title: 'Требуется авторизация',
        description: 'Войдите в систему чтобы оформить специальный заказ',
        type: 'info',
      })
      return
    }
    setOpen(true)
  }

  const handleBack = () => {
    setSelectedType(null)
  }

  const getDialogTitle = () => {
    switch (selectedType) {
      case 'made-to-order':
        return 'На заказ'
      case 'custom-design':
        return 'Индивидуальный заказ'
      case 'b2b-partnership':
        return 'Сотрудничество'
      default:
        return 'Выберите тип заказа'
    }
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => {
        setOpen(e.open)
        if (!e.open) {
          // Reset state when dialog closes
          setSelectedType(null)
        }
      }}
      size="xl"
      scrollBehavior="inside"
    >
      <Button onClick={handleOpenDialog} colorPalette="fg" size="lg" variant="outline" flex="1">
        <FaShoppingBag />
        Заказать
      </Button>

      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{getDialogTitle()}</DialogTitle>
            </DialogHeader>
            <DialogCloseTrigger />

            <DialogBody>
              {!selectedType ? (
                // Выбор типа заказа
                <Stack gap={4}>
                  {/* Путь 2: На заказ */}
                  <Button
                    onClick={() => setSelectedType('made-to-order')}
                    size="lg"
                    variant="outline"
                    colorPalette="fg"
                    height="auto"
                    py={4}
                    textAlign="left"
                    justifyContent="flex-start"
                    flexDirection="column"
                    alignItems="flex-start"
                  >
                    <Text fontWeight="bold" fontSize="lg">
                      На заказ
                    </Text>
                    <Text fontSize="sm" color="fg.muted" fontWeight="normal">
                      Закажите эту модель с вашими мерками и деталями кастомизации
                    </Text>
                  </Button>

                  {/* Путь 3: Индивидуальный заказ */}
                  <Button
                    onClick={() => setSelectedType('custom-design')}
                    size="lg"
                    variant="outline"
                    colorPalette="fg"
                    height="auto"
                    py={4}
                    textAlign="left"
                    justifyContent="flex-start"
                    flexDirection="column"
                    alignItems="flex-start"
                  >
                    <Text fontWeight="bold" fontSize="lg">
                      Индивидуальный заказ
                    </Text>
                    <Text fontSize="sm" color="fg.muted" fontWeight="normal">
                      Опишите свой дизайн — мы сошьём изделие по вашему описанию
                    </Text>
                  </Button>

                  {/* Путь 4: Сотрудничество B2B */}
                  <Button
                    onClick={() => setSelectedType('b2b-partnership')}
                    size="lg"
                    variant="outline"
                    colorPalette="fg"
                    height="auto"
                    py={4}
                    textAlign="left"
                    justifyContent="flex-start"
                    flexDirection="column"
                    alignItems="flex-start"
                  >
                    <Text fontWeight="bold" fontSize="lg">
                      Сотрудничество
                    </Text>
                    <Text fontSize="sm" color="fg.muted" fontWeight="normal">
                      Для магазинов, баеров и брендов — закажите размерную сетку
                    </Text>
                  </Button>
                </Stack>
              ) : selectedType === 'made-to-order' ? (
                <MadeToOrderForm
                  productId={productId}
                  variantId={variantId}
                  productItemId={productItemId}
                  userMeasurements={userMeasurements}
                  userContactInfo={userContactInfo}
                  onBack={handleBack}
                />
              ) : selectedType === 'custom-design' ? (
                <CustomDesignOrderForm
                  userMeasurements={userMeasurements}
                  userContactInfo={userContactInfo}
                  onBack={handleBack}
                />
              ) : selectedType === 'b2b-partnership' ? (
                <B2BPartnershipOrderForm
                  productId={productId}
                  variantId={variantId}
                  availableSizes={availableSizes}
                  allSizes={allSizes}
                  companyProfile={companyProfile}
                  onBack={handleBack}
                />
              ) : null}
            </DialogBody>

            {!selectedType && (
              <DialogFooter>
                <DialogActionTrigger asChild>
                  <Button variant="outline">Отмена</Button>
                </DialogActionTrigger>
              </DialogFooter>
            )}
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  )
}
