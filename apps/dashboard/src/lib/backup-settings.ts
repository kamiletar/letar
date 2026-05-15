import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

// Путь к данным dashboard
const dataDir = process.env.DASHBOARD_DATA_DIR || '/app/dashboard-data'
const settingsFile = path.join(dataDir, 'backup-settings.json')

/**
 * Типы расписаний для автобэкапов
 */
export type BackupSchedulePreset = 'disabled' | 'daily' | 'twice_daily' | 'weekly' | 'custom'

/**
 * Настройки бэкапов
 */
export interface BackupSettings {
  // Автоочистка старых бэкапов
  autoCleanupEnabled: boolean
  retentionDays: number // Сколько дней хранить бэкапы
  keepMinimum: number // Минимальное количество бэкапов для каждой БД

  // Автоматические бэкапы по расписанию
  autoBackupEnabled: boolean
  autoBackupSchedule: BackupSchedulePreset
  autoBackupCron: string // Cron выражение (используется когда schedule='custom')
  autoBackupDatabases: string[] // Какие БД бэкапить (пустой массив = все)
  lastAutoBackupRun: string | null // ISO timestamp последнего запуска
  lastAutoBackupStatus: 'success' | 'partial' | 'error' | null
}

/**
 * Пресеты расписаний
 */
export const SCHEDULE_PRESETS: Record<BackupSchedulePreset, { cron: string; label: string; description: string }> = {
  disabled: {
    cron: '',
    label: 'Отключено',
    description: 'Автобэкапы не выполняются',
  },
  daily: {
    cron: '0 3 * * *',
    label: 'Ежедневно',
    description: 'Каждый день в 3:00',
  },
  twice_daily: {
    cron: '0 3,15 * * *',
    label: 'Дважды в день',
    description: 'В 3:00 и 15:00',
  },
  weekly: {
    cron: '0 3 * * 0',
    label: 'Еженедельно',
    description: 'Каждое воскресенье в 3:00',
  },
  custom: {
    cron: '0 3 * * *',
    label: 'Свой cron',
    description: 'Укажите cron выражение',
  },
}

/**
 * Дефолтные настройки
 */
function getDefaultSettings(): BackupSettings {
  return {
    // Автоочистка
    autoCleanupEnabled: false,
    retentionDays: 30,
    keepMinimum: 3,
    // Автобэкапы
    autoBackupEnabled: false,
    autoBackupSchedule: 'disabled',
    autoBackupCron: '0 3 * * *',
    autoBackupDatabases: [], // Все БД по умолчанию
    lastAutoBackupRun: null,
    lastAutoBackupStatus: null,
  }
}

/**
 * Получение настроек бэкапов
 */
export async function getBackupSettings(): Promise<BackupSettings> {
  try {
    const content = await readFile(settingsFile, 'utf-8')
    const stored = JSON.parse(content) as Partial<BackupSettings>
    return {
      ...getDefaultSettings(),
      ...stored,
    }
  } catch {
    return getDefaultSettings()
  }
}

/**
 * Сохранение настроек бэкапов
 */
export async function saveBackupSettings(settings: BackupSettings): Promise<void> {
  await mkdir(dataDir, { recursive: true })
  await writeFile(settingsFile, JSON.stringify(settings, null, 2))
}
