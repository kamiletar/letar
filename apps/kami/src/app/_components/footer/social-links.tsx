import { HStack } from '@chakra-ui/react'
import { ExternalLink } from '@letar/ui'
import { FaFacebook, FaTelegram } from 'react-icons/fa'
import { LuGithub, LuMail } from 'react-icons/lu'

const socialLinks = [
  {
    href: 'https://github.com/kamiletar',
    icon: <LuGithub />,
    label: 'GitHub',
  },
  {
    href: 'https://www.facebook.com/letarkami',
    icon: <FaFacebook />,
    label: 'Facebook',
  },
  {
    href: 'https://t.me/husber',
    icon: <FaTelegram />,
    label: 'Telegram',
  },
  {
    href: 'mailto:kami@letar.best',
    icon: <LuMail />,
    label: 'Email',
  },
]

export function SocialLinks() {
  return (
    <HStack gap={4}>
      {socialLinks.map((link) => (
        <ExternalLink key={link.href} href={link.href} aria-label={link.label} size="lg">
          {link.icon}
        </ExternalLink>
      ))}
    </HStack>
  )
}
