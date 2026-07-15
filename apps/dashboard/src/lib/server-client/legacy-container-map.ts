/**
 * Маппинг имён приложений → имена контейнеров для legacy-роутов `api/apps/[app]/*`
 * (status/stats/logs). Покрывает только исторические приложения на локальном сервере —
 * современные приложения (time, grandslamcup, archetest и т.д.) мониторятся через
 * DB-driven реестр `DeployedApp` (`api/servers/[id]/apps/[appId]/*`), не через эту карту.
 */
export const LEGACY_CONTAINER_NAME_MAP: Record<string, string> = {
  dashboard: 'dashboard-app',
  'driving-school': 'driving-school-app',
  mandala: 'mandala-app',
  kami: 'kami-app',
}
