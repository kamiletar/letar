'use server'

import { logFailure, logSuccess } from '@/lib/audit-log'
import { requireAdmin } from '@/lib/auth-utils'
import type { NpmProxyHostCreate } from '@/lib/npm'
import { getNpmClientByServerId } from '@/lib/npm-client'

/**
 * Создать proxy host
 * @requires ADMIN role
 */
export async function createProxyHostAction(data: NpmProxyHostCreate, serverId?: string | null) {
  const user = await requireAdmin()
  try {
    const { client, hasNpm } = await getNpmClientByServerId(serverId)

    if (!hasNpm) {
      return { success: false, error: 'NPM не настроен для этого сервера' }
    }

    const host = await client.createProxyHost(data)
    await logSuccess(user.username, user.role, 'NPM_PROXY_HOST_CREATE', String(host.id), {
      domains: host.domain_names,
      forward: `${host.forward_scheme}://${host.forward_host}:${host.forward_port}`,
      ssl: data.certificate_id === 'new' ? 'new' : data.certificate_id ? 'existing' : 'none',
      serverId,
    })
    return { success: true, data: host }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'NPM_PROXY_HOST_CREATE', errorMsg, undefined, {
      domains: data.domain_names,
      serverId,
    })
    console.error('Error creating proxy host:', error)
    return { success: false, error: errorMsg }
  }
}

/**
 * Включить/выключить proxy host
 * @requires ADMIN role
 */
export async function toggleProxyHostAction(hostId: number, enabled: boolean, serverId?: string | null) {
  const user = await requireAdmin()
  try {
    const { client, hasNpm } = await getNpmClientByServerId(serverId)

    if (!hasNpm) {
      return { success: false, error: 'NPM не настроен для этого сервера' }
    }

    const host = await client.toggleProxyHost(hostId, enabled)
    await logSuccess(user.username, user.role, 'NPM_PROXY_HOST_TOGGLE', String(hostId), {
      enabled,
      domains: host.domain_names,
      serverId,
    })
    return { success: true, data: host }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'NPM_PROXY_HOST_TOGGLE', errorMsg, String(hostId), {
      enabled,
      serverId,
    })
    console.error('Error toggling proxy host:', error)
    return { success: false, error: errorMsg }
  }
}

/**
 * Удалить proxy host
 * @requires ADMIN role
 */
export async function deleteProxyHostAction(hostId: number, serverId?: string | null) {
  const user = await requireAdmin()
  try {
    const { client, hasNpm } = await getNpmClientByServerId(serverId)

    if (!hasNpm) {
      return { success: false, error: 'NPM не настроен для этого сервера' }
    }

    await client.deleteProxyHost(hostId)
    await logSuccess(user.username, user.role, 'NPM_PROXY_HOST_DELETE', String(hostId), {
      serverId,
    })
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'NPM_PROXY_HOST_DELETE', errorMsg, String(hostId), {
      serverId,
    })
    console.error('Error deleting proxy host:', error)
    return { success: false, error: errorMsg }
  }
}

/**
 * Удалить сертификат
 * @requires ADMIN role
 */
export async function deleteCertificateAction(certificateId: number, serverId?: string | null) {
  const user = await requireAdmin()
  try {
    const { client, hasNpm } = await getNpmClientByServerId(serverId)

    if (!hasNpm) {
      return { success: false, error: 'NPM не настроен для этого сервера' }
    }

    await client.deleteCertificate(certificateId)
    await logSuccess(user.username, user.role, 'NPM_CERTIFICATE_DELETE', String(certificateId), {
      serverId,
    })
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'NPM_CERTIFICATE_DELETE', errorMsg, String(certificateId), { serverId })
    console.error('Error deleting certificate:', error)
    return { success: false, error: errorMsg }
  }
}

/**
 * Удалить access list
 * @requires ADMIN role
 */
export async function deleteAccessListAction(accessListId: number, serverId?: string | null) {
  const user = await requireAdmin()
  try {
    const { client, hasNpm } = await getNpmClientByServerId(serverId)

    if (!hasNpm) {
      return { success: false, error: 'NPM не настроен для этого сервера' }
    }

    await client.deleteAccessList(accessListId)
    await logSuccess(user.username, user.role, 'NPM_ACCESS_LIST_DELETE', String(accessListId), {
      serverId,
    })
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'NPM_ACCESS_LIST_DELETE', errorMsg, String(accessListId), { serverId })
    console.error('Error deleting access list:', error)
    return { success: false, error: errorMsg }
  }
}
