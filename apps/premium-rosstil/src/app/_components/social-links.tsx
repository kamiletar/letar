import { HStack, Icon, Link } from '@chakra-ui/react'
import { FaTelegramPlane, FaVk, FaWhatsapp } from 'react-icons/fa'

interface SocialLinksProps {
  size?: 'lg' | 'xl' | '2xl'
  gap?: number
  color?: string
}

export function SocialLinks({ size = '2xl', gap = 4, color }: SocialLinksProps) {
  return (
    <HStack gap={gap}>
      <Link
        href="https://t.me/premium_rosstil"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Telegram"
        color={color}
        _hover={{ opacity: 0.7 }}
        transition="opacity 0.2s"
      >
        <Icon size={size}>
          <FaTelegramPlane />
        </Icon>
      </Link>
      <Link
        href="https://wa.me/79104343523"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        color={color}
        _hover={{ opacity: 0.7 }}
        transition="opacity 0.2s"
      >
        <Icon size={size}>
          <FaWhatsapp />
        </Icon>
      </Link>
      <Link
        href="https://vk.com/premium_rosstil"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="VK"
        color={color}
        _hover={{ opacity: 0.7 }}
        transition="opacity 0.2s"
      >
        <Icon size={size}>
          <FaVk />
        </Icon>
      </Link>
    </HStack>
  )
}
