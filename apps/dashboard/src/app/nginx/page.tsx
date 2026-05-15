import { redirect } from 'next/navigation'

/**
 * Страница /nginx редиректит на /nginx/proxy-hosts
 */
export default function NginxPage() {
  redirect('/nginx/proxy-hosts')
}
