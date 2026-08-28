import type { ShowcaseProject } from '@/lib/projects-data'
import { Box, Flex, Text } from '@chakra-ui/react'
import { ArrowUpRight } from 'lucide-react'
import Image from 'next/image'

interface EcosystemPreviewProps {
  items: ShowcaseProject[]
}

/** Два перекрывающихся окна, визуально связывающие Studio и личный сайт Kami */
export function EcosystemPreview({ items }: EcosystemPreviewProps) {
  return (
    <Box className="ecosystem-preview" aria-label="Главные сайты экосистемы">
      {items.map((item, index) => (
        <Box
          key={item.name}
          asChild
          className={`preview-window preview-window-${index + 1}`}
          borderRadius={{ base: 'xl', md: '2xl' }}
          borderWidth="1px"
          borderColor="border.emphasized"
          bg="bg.card"
          boxShadow="0 24px 80px rgba(0, 0, 0, 0.34)"
          overflow="hidden"
          transition="transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease"
          _hover={{
            borderColor: 'brand.400',
            transform: 'translateY(-5px)',
            boxShadow: '0 28px 90px rgba(0, 0, 0, 0.44)',
          }}
          _focusVisible={{ outline: '3px solid', outlineColor: 'brand.300', outlineOffset: '4px' }}
        >
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Открыть ${item.name} в новой вкладке`}
          >
            <Flex minH="10" px={4} align="center" gap={2.5} borderBottomWidth="1px" borderColor="border">
              <Flex gap={1.5} aria-hidden="true">
                <Box boxSize="2" borderRadius="full" bg="red.400" opacity="0.75" />
                <Box boxSize="2" borderRadius="full" bg="yellow.400" opacity="0.75" />
                <Box boxSize="2" borderRadius="full" bg="brand.300" opacity="0.75" />
              </Flex>
              <Text className="signal-font" fontSize="xs" color="fg.muted" flex="1" lineClamp={1}>
                {item.name.toLowerCase().replace(' ', '.')} / {item.label.toLowerCase()}
              </Text>
              <ArrowUpRight aria-hidden="true" size={15} />
            </Flex>
            <Box position="relative" aspectRatio="8 / 5" bg="bg.muted">
              <Image
                src={item.image}
                alt={item.imageAlt}
                fill
                preload
                fetchPriority="high"
                placeholder="blur"
                sizes="(max-width: 768px) 92vw, 520px"
                style={{ objectFit: 'cover' }}
              />
            </Box>
          </a>
        </Box>
      ))}
    </Box>
  )
}
