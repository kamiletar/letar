/**
 * Типы для страницы серверов
 */

import type { AppType } from '@/generated/prisma/client'
import type { ServerInfo } from '@/lib/server-client'

// =============================================================================
// Types
// =============================================================================

export interface DeployedApp {
  id: string
  name: string
  displayName: string
  containerName: string | null
  port: number | null
  type: AppType
  imageName: string | null
  domain: string | null
  lastDeployed: string | null
}

export interface ServerWithApps extends ServerInfo {
  apps?: DeployedApp[]
}

export interface ServerFormData {
  name: string
  displayName: string
  host: string
  port: number
  isLocal: boolean
  agentToken: string
  // NPM credentials
  npmUrl: string
  npmEmail: string
  npmPassword: string
}

export interface AppFormData {
  name: string
  displayName: string
  containerName: string
  port: string
  type: AppType
  imageName: string
}

export interface DiscoveredApp {
  name: string
  displayName: string
  containerName: string
  imageName: string
  port: number | null
  isRunning: boolean
  alreadyAdded: boolean
}

// =============================================================================
// Constants
// =============================================================================

export const emptyServerForm: ServerFormData = {
  name: '',
  displayName: '',
  host: '',
  port: 3100,
  isLocal: false,
  agentToken: '',
  npmUrl: '',
  npmEmail: '',
  npmPassword: '',
}

export const emptyAppForm: AppFormData = {
  name: '',
  displayName: '',
  containerName: '',
  port: '',
  type: 'WEB',
  imageName: '',
}
