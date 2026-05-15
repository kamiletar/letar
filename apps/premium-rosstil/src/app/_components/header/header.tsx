import { AuthButton } from '@/app/_components/auth-button'
import { CartButton } from '@/app/_components/cart-button'
import { HeaderSearch } from '@/app/_components/header/header-search'
import { LogoAnimated } from '@/app/_components/logo-animated'
import { MobileMenu } from '@/app/_components/mobile-menu'
import { NavLinksDesktop } from '@/app/_components/nav-links-desktop'
import { OnlyFor } from '@/app/_components/only-for'
import { SignInButtonClient as SignInButton } from '@/app/_components/sign-in-button-client'
import { UserMenu } from '@/app/_components/user-menu'
import { Link } from '@/i18n/navigation'
import { Box, Grid, Heading, HStack, Icon, IconButton, LinkBox, LinkOverlay } from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import { FiPhoneOutgoing } from 'react-icons/fi'

export const Header = async () => {
  return (
    <>
      <Box position={'fixed'} zIndex={20} top={3} left={3} display={['block', 'block', 'none']}>
        <MobileMenu />
      </Box>
      <Box position="relative">
        <Box position={'fixed'} zIndex={20} right={3} top={3} display={['flex', 'flex', 'none']} gap={2}>
          {/* Поиск на мобильных */}
          <HeaderSearch mode="mobile" />
          {/* Авторизованным — телефон, неавторизованным — кнопка входа */}
          <OnlyFor userRole={['USER', 'ADMIN']} fallback={<SignInButton />}>
            <IconButton
              rounded={'full'}
              as={'a'}
              // @ts-expect-error хз что с этим сделать. chakra.a не помогло
              href={'tel:+79104343523'}
              target={'_blank'}
              variant={'subtle'}
              color={'fg'}
              aria-label="Позвонить нам"
            >
              <Icon size={'xl'}>
                <FiPhoneOutgoing />
              </Icon>
            </IconButton>
          </OnlyFor>
        </Box>
        <HStack justifyContent={'center'}>
          <LinkBox width={'22vh'} pt={1}>
            <LinkOverlay asChild>
              <Link href={'/'}>
                <LogoAnimated />
              </Link>
            </LinkOverlay>
          </LinkBox>
        </HStack>
        <HStack pt={2} pb={2} textAlign="center" justifyContent={'center'} wrap={'wrap'} px={'3em'}>
          <Heading size="3xl" fontWeight={600}>
            Дизайнерская
          </Heading>
          <Heading size="3xl" fontWeight={600} whiteSpace={'nowrap'}>
            Женская Одежда
          </Heading>
        </HStack>
      </Box>
      <Box
        as="nav"
        data-testid="navigation"
        p={2}
        position={'sticky'}
        bg={'bg'}
        zIndex={20}
        top={0}
        display={['none', 'none', 'block']}
      >
        <Grid templateColumns="1fr auto 1fr" alignItems="center" pl={4} pr={2}>
          <HStack justify="flex-start" pl={4}>
            <HeaderSearch mode="desktop" />
          </HStack>
          <HStack justify="center">
            <NavLinksDesktop />
          </HStack>
          <HStack position={'fixed'} top={0} right={0} pr={4} pt={1.5} justify="flex-end" gap={4}>
            <ColorModeButton />
            <CartButton />
            <UserMenu />
            <AuthButton />
          </HStack>
        </Grid>
      </Box>
    </>
  )
}
