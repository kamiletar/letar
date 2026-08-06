/**
 * Компонент для отображения социальных ссылок из JSON поля socialLinks.
 *
 * Поддерживает платформы: Telegram, VK, stihi.ru, YouTube, Instagram, Twitter, TikTok, website.
 *
 * Два варианта:
 * - compact: маленькие иконки в строку (для списков/таблиц)
 * - full: иконки с подписями (для профилей)
 */

import { Flex, IconButton, Link as ChakraLink, Text } from '@chakra-ui/react'
import { FaInstagram, FaTiktok, FaTwitter, FaYoutube } from 'react-icons/fa'
import { LuBookOpen, LuExternalLink, LuSend } from 'react-icons/lu'

/** Формат одной ссылки в socialLinks JSON */
export interface SocialLink {
  platform: string
  url: string
}

/** Безопасный парсинг socialLinks из Prisma JSON */
export function parseSocialLinks(json: unknown): SocialLink[] {
  if (!Array.isArray(json)) {
    return []
  }
  return json.filter(
    (item): item is SocialLink =>
      typeof item === 'object' && item !== null && typeof item.platform === 'string' && typeof item.url === 'string',
  )
}

/** SVG-иконка VK (нет в lucide/react-icons) */
function VkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" {...props}>
      <path d="M12.785 16.241s.288-.032.436-.192c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.598-.188 1.368 1.259 2.183 1.815.616.42 1.084.328 1.084.328l2.178-.03s1.14-.07.6-.964c-.044-.073-.316-.661-1.623-1.869-1.37-1.264-1.187-1.06.463-3.249.005-.005.007-.007.01-.011 1.005-1.33 1.407-2.142 1.282-2.49-.12-.331-.853-.244-.853-.244l-2.45.015s-.182-.025-.316.056c-.131.079-.215.263-.215.263s-.386 1.028-.9 1.902c-1.085 1.843-1.52 1.94-1.697 1.826-.413-.265-.31-1.066-.31-1.634 0-1.777.27-2.518-.524-2.71-.264-.063-.457-.105-1.13-.112-.863-.009-1.593.003-2.007.205-.275.134-.488.434-.358.451.16.021.522.098.714.358.248.336.239 1.09.239 1.09s.143 2.093-.332 2.352c-.327.178-.775-.185-1.737-1.846-.493-.851-.865-1.792-.865-1.792s-.072-.176-.2-.27c-.154-.114-.37-.15-.37-.15l-2.327.016s-.35.01-.478.162c-.114.135-.009.414-.009.414s1.81 4.233 3.86 6.365c1.882 1.956 4.02 1.827 4.02 1.827h.97z" />
    </svg>
  )
}

/** Конфиг платформ: иконка, название, цвет */
const PLATFORM_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  telegram: { icon: <LuSend size={14} />, label: 'Telegram', color: 'blue' },
  vk: { icon: <VkIcon />, label: 'VKontakte', color: 'blue' },
  'stihi.ru': { icon: <LuBookOpen size={14} />, label: 'Стихи.ру', color: 'orange' },
  youtube: { icon: <FaYoutube size={14} />, label: 'YouTube', color: 'red' },
  instagram: { icon: <FaInstagram size={14} />, label: 'Instagram', color: 'pink' },
  twitter: { icon: <FaTwitter size={14} />, label: 'Twitter', color: 'cyan' },
  tiktok: { icon: <FaTiktok size={14} />, label: 'TikTok', color: 'gray' },
  website: { icon: <LuExternalLink size={14} />, label: 'Сайт', color: 'green' },
}

interface SocialLinksProps {
  socialLinks?: SocialLink[] | null
  /** compact — маленькие иконки; full — с подписями */
  variant?: 'compact' | 'full'
}

export function SocialLinks({ socialLinks, variant = 'compact' }: SocialLinksProps) {
  if (!socialLinks || socialLinks.length === 0) return null

  if (variant === 'compact') {
    return (
      <Flex gap={1} align="center" flexShrink={0}>
        {socialLinks.map((link) => {
          const config = PLATFORM_CONFIG[link.platform] || PLATFORM_CONFIG.website
          return (
            <ChakraLink key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" title={config.label}>
              <IconButton
                aria-label={config.label}
                size="xs"
                variant="ghost"
                colorPalette={config.color}
                minW="28px"
                minH="28px"
              >
                {config.icon}
              </IconButton>
            </ChakraLink>
          )
        })}
      </Flex>
    )
  }

  // Полный вариант — с подписями
  return (
    <Flex gap={3} align="center" flexWrap="wrap">
      {socialLinks.map((link) => {
        const config = PLATFORM_CONFIG[link.platform] || PLATFORM_CONFIG.website
        return (
          <ChakraLink
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            _hover={{ textDecoration: 'none', opacity: 0.8 }}
          >
            <Flex
              gap={1.5}
              align="center"
              bg={`${config.color}.subtle`}
              color={`${config.color}.fg`}
              px={3}
              py={1.5}
              borderRadius="full"
              fontSize="sm"
              fontWeight="medium"
            >
              {config.icon}
              <Text>{config.label}</Text>
            </Flex>
          </ChakraLink>
        )
      })}
    </Flex>
  )
}
