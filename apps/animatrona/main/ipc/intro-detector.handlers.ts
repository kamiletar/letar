/**
 * IPC handlers для автоопределения OP/ED
 */

import { detectIntros, type EpisodeInput, type IntroDetectorResult } from '../services/intro-detector'
import { TempFileManager } from '../services/temp-file-manager'
import { createHandlerWithEvent } from '../utils/ipc-handler-factory'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('IntroDetectorHandlers')

/** Входные данные для определения OP/ED из IPFS */
interface DetectFromIpfsInput {
  id: string
  /** CID аудиодорожки (AudioTrack.transcodedCid) */
  audioCid: string
  duration: number
}

/**
 * Регистрирует IPC handlers для intro-detector
 */
export function registerIntroDetectorHandlers(): void {
  // Запуск определения OP/ED из локальных файлов
  // Отправляет прогресс через event.sender
  createHandlerWithEvent<[EpisodeInput[]], IntroDetectorResult[]>('introDetector:detect', async (event, episodes) => {
    const results = await detectIntros(episodes, (percent, stage) => {
      event.sender.send('introDetector:progress', percent, stage)
    })
    return results
  })

  // Запуск определения OP/ED из IPFS (скачивает видео во temp)
  createHandlerWithEvent<[DetectFromIpfsInput[]], IntroDetectorResult[]>(
    'introDetector:detectFromIpfs',
    async (event, episodes) => {
      const manager = new TempFileManager()

      try {
        // Скачиваем аудиодорожки из IPFS во временные файлы
        log.info(`Скачиваю ${episodes.length} аудиодорожек из IPFS для определения OP/ED`)
        event.sender.send('introDetector:progress', 0, 'downloading')

        const episodeInputs: EpisodeInput[] = []

        for (let i = 0; i < episodes.length; i++) {
          const ep = episodes[i]
          event.sender.send(
            'introDetector:progress',
            Math.round((i / episodes.length) * 30),
            `downloading ${i + 1}/${episodes.length}`,
          )

          const localPath = await manager.downloadFromIpfs(ep.audioCid, `ep-${ep.id}.opus`)
          episodeInputs.push({
            id: ep.id,
            sourcePath: localPath,
            duration: ep.duration,
          })
        }

        log.info(`Скачано ${episodeInputs.length} файлов, запускаю определение OP/ED`)

        // Запускаем определение с прогрессом (30-100%)
        const results = await detectIntros(episodeInputs, (percent, stage) => {
          // Масштабируем прогресс: 30% уже потрачено на скачивание
          const scaledPercent = 30 + Math.round(percent * 0.7)
          event.sender.send('introDetector:progress', scaledPercent, stage)
        })

        return results
      } finally {
        // Всегда удаляем временные файлы
        await manager.cleanup()
      }
    },
  )
}
