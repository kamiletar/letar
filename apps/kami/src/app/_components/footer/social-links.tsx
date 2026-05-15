import { HStack, IconButton, Link } from '@chakra-ui/react'
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
        <IconButton key={link.href} asChild variant="ghost" size="lg" aria-label={link.label}>
          <Link href={link.href} target="_blank" rel="noopener noreferrer">
            {link.icon}
          </Link>
        </IconButton>
      ))}
    </HStack>
  )
}
