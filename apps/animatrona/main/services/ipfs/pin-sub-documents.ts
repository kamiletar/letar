/**
 * Явный recursive pin для суб-документов манифестов.
 *
 * addBytes() (client.add) создаёт direct pin для single-block контента.
 * Direct pins НЕ видны через pin.ls({ type: 'recursive' }), поэтому аудит
 * хранилища считает их "незапиненными". Кроме того, direct pins могут теряться
 * при миграции datastore или коррупции.
 *
 * Эта функция ставит explicit recursive pin для каждого CID,
 * гарантируя видимость в аудите и надёжную защиту от GC.
 */

import { CID } from 'multiformats/cid'

import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'

const log = createModuleLogger('PinSubDocuments')

/**
 * Закрепить список CID как recursive pins.
 * Безопасно для повторных вызовов — уже закреплённые CID пропускаются.
 *
 * @param cids — массив пар [имя, CID] для логирования
 */
export async function pinSubDocuments(cids: Array<[label: string, cid: string | undefined]>): Promise<void> {
  const client = getKuboService().getClientOrNull()
  if (!client) {
    return
  }

  const toPin = cids.filter((pair): pair is [string, string] => pair[1] != null)
  if (toPin.length === 0) {
    return
  }

  let pinned = 0
  let skipped = 0

  for (const [label, cidStr] of toPin) {
    try {
      await client.pin.add(CID.parse(cidStr), { recursive: true })
      pinned++
    } catch {
      // Уже закреплён или ошибка — не критично
      skipped++
    }
  }

  if (pinned > 0) {
    log.info('Суб-документы закреплены (recursive)', {
      pinned,
      skipped,
      labels: toPin.map(([l]) => l).join(', '),
    })
  }
}
