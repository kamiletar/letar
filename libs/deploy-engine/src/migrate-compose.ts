/**
 * Трансформация `docker-compose.production.yml` сервиса `app` в rollout-профиль (§18.6).
 *
 * За тираж §18.6 Сессии J этот набор правок применялся вручную к ~15 приложениям — почти
 * идентичный diff каждый раз, и дважды именно ручная правка вносила баг (комментарий между
 * `ports:` и портом ломал парсинг `DB_PORT` в `deploy-affected.sh`; healthcheck на `localhost`
 * вместо `127.0.0.1`/`0.0.0.0` давал ложный `unhealthy` на IPv6-хостах). Автоматизация того же
 * преобразования исключает эту категорию опечаток на оставшихся кандидатах.
 *
 * Используется YAML `Document` (не `parse`/`stringify`) — сохраняет форматирование и
 * существующие комментарии при точечных правках, а не пересобирает файл с нуля.
 */

import { isMap, isSeq, parseDocument, type Scalar, YAMLMap, YAMLSeq } from 'yaml'

export interface MigrateComposeResult {
  /** Итоговый YAML (не изменяется, если `changed: false`). */
  yaml: string
  /** Были ли внесены изменения. */
  changed: boolean
  /** Предупреждения о том, что не удалось сделать автоматически — требуют ручной проверки. */
  warnings: string[]
}

function scalarValue(node: unknown): string | undefined {
  if (typeof node === 'string') {
    return node
  }
  if (node && typeof node === 'object' && 'value' in node) {
    const value = (node as Scalar).value
    return typeof value === 'string' ? value : undefined
  }
  return undefined
}

/**
 * Применяет rollout-профиль к сервису `app` в docker-compose.production.yml.
 *
 * Правки: убрать `container_name`/`ports` у `app`, `image` → `${DEPLOY_TAG:-latest}`,
 * добавить `stop_grace_period: 30s` и `labels.letar.rollout: 'true'` если их нет,
 * `networks` из плоского списка → объектная форма с alias `<app>-app`.
 *
 * НЕ добавляет `healthcheck`, если он отсутствует — угадывать эндпоинт/порт для health-проверки
 * production-сервиса рискованнее, чем оставить явное предупреждение для ручного добавления.
 */
export function migrateComposeToRollout(yamlText: string, appName: string): MigrateComposeResult {
  const doc = parseDocument(yamlText)
  const warnings: string[] = []
  let changed = false

  const services = doc.get('services')
  if (!isMap(services)) {
    throw new Error('docker-compose файл не содержит "services"')
  }
  const appService = services.get('app')
  if (!isMap(appService)) {
    throw new Error('Сервис "app" не найден в docker-compose')
  }

  // 1. container_name — убираем, конфликтует со scale=2
  if (appService.has('container_name')) {
    appService.delete('container_name')
    changed = true
  }

  // 2. ports — снимаем публикацию host-порта, запоминаем внутренний порт для healthcheck-подсказки
  let innerPort: string | undefined
  const portsNode = appService.get('ports', true)
  if (isSeq(portsNode)) {
    const first = scalarValue(portsNode.items[0])
    innerPort = first?.match(/:(\d+)\s*$/)?.[1]
    appService.delete('ports')
    changed = true
  }

  // 3. image → добавляем ${DEPLOY_TAG:-latest} для rollback без пересборки
  const imageValue = scalarValue(appService.get('image', true))
  if (imageValue && !imageValue.includes('${DEPLOY_TAG')) {
    const name = imageValue.split(':')[0]
    appService.set('image', `${name}:\${DEPLOY_TAG:-latest}`)
    changed = true
  }

  // 4. stop_grace_period — стандарт grandslamcup
  if (!appService.has('stop_grace_period')) {
    appService.set('stop_grace_period', '30s')
    changed = true
  }

  // 5. labels.letar.rollout — создаём map, либо дополняем существующие labels (map или seq-форма)
  const labelsNode = appService.get('labels', true)
  if (!labelsNode) {
    const map = new YAMLMap()
    map.set('letar.rollout', 'true')
    appService.set('labels', map)
    changed = true
  } else if (isMap(labelsNode)) {
    if (!labelsNode.has('letar.rollout')) {
      labelsNode.set('letar.rollout', 'true')
      changed = true
    }
  } else if (isSeq(labelsNode)) {
    const hasRollout = labelsNode.items.some((item) => scalarValue(item)?.startsWith('letar.rollout='))
    if (!hasRollout) {
      labelsNode.add('letar.rollout=true')
      changed = true
    }
  }

  // 6. healthcheck — не гадаем, только предупреждаем
  if (!appService.has('healthcheck')) {
    warnings.push(
      innerPort
        ? `healthcheck отсутствует — добавь вручную (вероятный порт из снятого ports: ${innerPort})`
        : 'healthcheck отсутствует и порт не удалось определить из ports — добавь вручную'
    )
  }

  // 7. networks — плоский список → объектная форма с alias <app>-app (сохраняет NPM Forward Host)
  const networksNode = appService.get('networks', true)
  const aliasName = `${appName}-app`
  if (isSeq(networksNode)) {
    const netNames = networksNode.items.map((item) => scalarValue(item)).filter((v): v is string => Boolean(v))
    const map = new YAMLMap()
    for (const net of netNames) {
      const netCfg = new YAMLMap()
      netCfg.set('aliases', new YAMLSeq())
      const aliasSeq = netCfg.get('aliases') as YAMLSeq
      aliasSeq.add(aliasName)
      map.set(net, netCfg)
    }
    appService.set('networks', map)
    changed = true
  } else if (isMap(networksNode)) {
    for (const pair of networksNode.items) {
      const netCfg = pair.value
      if (!isMap(netCfg)) {
        continue
      }
      const aliasesNode = netCfg.get('aliases', true)
      if (isSeq(aliasesNode)) {
        const hasAlias = aliasesNode.items.some((item) => scalarValue(item) === aliasName)
        if (!hasAlias) {
          aliasesNode.add(aliasName)
          changed = true
        }
      } else {
        const seq = new YAMLSeq()
        seq.add(aliasName)
        netCfg.set('aliases', seq)
        changed = true
      }
    }
  } else {
    warnings.push('networks не найден или в неизвестном формате у сервиса app — alias не добавлен, проверь вручную')
  }

  return { yaml: doc.toString(), changed, warnings }
}
