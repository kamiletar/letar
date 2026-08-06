'use client'
import { Box, HStack, Image, Text, VStack } from '@chakra-ui/react'
import { forwardRef } from 'react'
import { cousine, sourceSans3 } from '../../_fonts'
import { eacSignBase64 } from './assets'
import logo from './images/rosstil-logo.png'
import uhod from './images/uhod.png'

/**
 * Информация о товаре
 */
export interface ProductInfo {
  name: string
  articleCode?: string
  composition?: string
  color?: string
  size?: string
}

/**
 * Данные для этикетки
 */
export interface LabelData {
  product: ProductInfo
  dataMatrixBase64: string
  gtinBarcodeBase64: string
  gtin13?: string
}

/**
 * Props компонента этикетки
 */
export interface LabelTemplateProps {
  data: LabelData
  /** Ширина этикетки в пикселях */
  width?: number
  /** Высота этикетки в пикселях */
  height?: number
}

/**
 * React компонент этикетки РОССТИЛЬ
 * Соответствует оригинальному PNG шаблону
 */
export const LabelTemplate = forwardRef<HTMLDivElement, LabelTemplateProps>(function LabelTemplate(
  { data, width = 685, height = 461 },
  ref,
) {
  const { product, dataMatrixBase64, gtinBarcodeBase64 } = data
  // TODO: заменить статичный uhod.src на динамические иконки
  // const careIcons = product.composition ? getCareIconsByComposition(product.composition) : careSetDefault

  return (
    <Box
      ref={ref}
      w={`${width}px`}
      h={`${height}px`}
      bg="white"
      fontFamily="Arial, sans-serif"
      position="relative"
      boxSizing="border-box"
      color="black"
      className={cousine.className}
      pt={5}
    >
      <HStack justifyContent={'flex-start'} alignItems={'stretch'}>
        {/* ШАПКА: Логотип + РОССТИЛЬ */}
        <VStack gap="16px" align="center" mb="20px" p={'12px'}>
          {/* Круглый логотип с галстуком */}
          <Image src={logo.src} w="160px" alt="Росстиль" />
          {/* Название бренда */}
          <VStack align="start" gap="0" className={sourceSans3.className}>
            <Text fontSize="36px" fontWeight="700" letterSpacing="2px" lineHeight="1">
              РОССТИЛЬ
            </Text>
            <Text fontSize="24px" color="#333" mt="4px">
              Сделано в России
            </Text>
          </VStack>
          {/* DataMatrix - справа внизу */}
          <Image src={dataMatrixBase64} left="60px" w="160px" h="160px" alt="DataMatrix" />
        </VStack>

        {/* ИНФОРМАЦИЯ О ТОВАРЕ */}
        <VStack align="start" gap="2px" pl="10px" pt={2} mb={6}>
          {/* Название товара */}
          <Text fontSize="32px" fontWeight="bold" mb={0}>
            {product.name}
          </Text>

          {/* Артикул */}
          {product.articleCode && (
            <HStack fontSize="22px" gap="8px">
              <Text fontWeight="bold">Артикул:</Text>
              <Text>{product.articleCode}</Text>
            </HStack>
          )}

          {/* Состав */}
          {product.composition && (
            <HStack fontSize="22px" gap="8px">
              <Text fontWeight="bold">Состав:</Text>
              <Text>{product.composition}</Text>
            </HStack>
          )}

          {/* Цвет */}
          {product.color && (
            <HStack fontSize="22px" gap="8px">
              <Text fontWeight="bold">Цвет:</Text>
              <Text>{product.color}</Text>
            </HStack>
          )}

          {/* Размер */}
          {product.size && (
            <HStack fontSize="22px" gap="8px">
              <Text fontWeight="bold">Размер:</Text>
              <Text>{product.size}</Text>
            </HStack>
          )}

          {/* Иконки ухода */}
          <HStack align="center" mt="4px" gap="8px">
            <Text fontWeight="bold" fontSize="18px">
              Уход:
            </Text>
            <img src={uhod.src} />
          </HStack>
          <Text lineHeight={1} fontSize="64px" flex={1}>
            rosstil.ru
          </Text>
          <Text fontSize="26px" color="#000" fontWeight="medium">
            ИП Аксянова Е.Ю.
          </Text>

          <Text fontSize="24px" color="#000" fontWeight="medium">
            ИНН 682701271521
          </Text>
          <Text fontSize="18px" color="#000" fontWeight="medium">
            ТР ТС 017/2011. ЕАЭС RU
          </Text>
          <Text fontSize="21px" color="#000" fontWeight="medium">
            Д-RU.РА04.В.84763/24
          </Text>
        </VStack>
      </HStack>

      {/* EAC знак - слева внизу */}
      <Box position="absolute" right="55px" bottom="38px">
        <Image src={eacSignBase64} w="80px" alt="EAC" />
      </Box>

      {/* GTIN баркод - справа вертикально (поворот через CSS) */}
      <Box position="absolute" right="-60px" top="120px" transform="rotate(-90deg)" transformOrigin="center center">
        <img src={gtinBarcodeBase64} alt="GTIN" />
      </Box>
    </Box>
  )
})

export default LabelTemplate
