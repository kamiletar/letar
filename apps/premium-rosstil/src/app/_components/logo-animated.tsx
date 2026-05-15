'use client'

import logo from '@/app/_images/logo.svg'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export const LogoAnimated = () => {
  const pathname = usePathname()
  // Use pathname directly as key to trigger re-render without setState in effect
  return <Image key={pathname} priority style={{ objectFit: 'contain' }} src={logo} alt={'Премиум РосСтиль'} />
}
