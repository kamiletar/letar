/**
 * QRScannerModal — модальное окно с камерой для сканирования QR-кодов
 *
 * Используется на ConnectScreen для быстрого подключения к серверу.
 * Парсит QR формата: animatrona://<host>:<port>?key=<apiKey>&type=tracker
 */

import { X } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera'

import type { ServerType } from '@/types/server'

/** Результат сканирования QR-кода */
export interface QRScanResult {
  type: ServerType
  url: string
  apiKey?: string
}

interface QRScannerModalProps {
  visible: boolean
  onClose: () => void
  onScan: (result: QRScanResult) => void
}

/**
 * Парсинг QR-кода сервера
 *
 * Форматы:
 * - animatrona://192.168.1.100:3100 (Desktop)
 * - animatrona://host.com?key=xxx&type=tracker (Tracker)
 * - http(s)://host:port (фоллбэк — Desktop)
 */
function parseQRCode(value: string): QRScanResult | null {
  try {
    // animatrona:// протокол
    if (value.startsWith('animatrona://')) {
      const rest = value.replace('animatrona://', '')
      // Парсим через URL с фейковым протоколом
      const parsed = new URL(`http://${rest}`)
      const type = (parsed.searchParams.get('type') as ServerType) || 'desktop'
      const apiKey = parsed.searchParams.get('key') ?? undefined

      // Собираем URL без query params
      const host = parsed.host // host:port
      const url = type === 'tracker' ? `https://${host}` : `http://${host}`

      return { type, url, apiKey }
    }

    // http(s):// фоллбэк
    if (value.startsWith('http://') || value.startsWith('https://')) {
      const parsed = new URL(value)
      const type = parsed.searchParams.get('type') === 'tracker' ? 'tracker' : 'desktop'
      const apiKey = parsed.searchParams.get('key') ?? undefined
      const url = `${parsed.protocol}//${parsed.host}`

      return { type, url, apiKey }
    }

    return null
  } catch {
    return null
  }
}

export function QRScannerModal({ visible, onClose, onScan }: QRScannerModalProps) {
  const device = useCameraDevice('back')
  const { hasPermission, requestPermission } = useCameraPermission()
  const [scanned, setScanned] = useState(false)

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (scanned) return
      const code = codes[0]
      if (!code?.value) return

      const result = parseQRCode(code.value)
      if (result) {
        setScanned(true)
        onScan(result)
      }
    },
  })

  // Сбрасываем состояние при открытии
  const handleClose = useCallback(() => {
    setScanned(false)
    onClose()
  }, [onClose])

  // Запрашиваем разрешение при первом показе
  const content = useMemo(() => {
    if (!hasPermission) {
      return (
        <View style={styles.centered}>
          <Text style={styles.permissionText}>Для сканирования QR-кода{'\n'}нужен доступ к камере</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Разрешить камеру</Text>
          </TouchableOpacity>
        </View>
      )
    }

    if (!device) {
      return (
        <View style={styles.centered}>
          <Text style={styles.permissionText}>Камера не найдена</Text>
        </View>
      )
    }

    return (
      <View style={StyleSheet.absoluteFill}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={visible && !scanned}
          codeScanner={codeScanner}
        />

        {/* Рамка-прицел */}
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            {/* Углы рамки */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scanHint}>Наведите камеру на QR-код</Text>
        </View>
      </View>
    )
  }, [hasPermission, device, visible, scanned, codeScanner, requestPermission])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {content}

        {/* Кнопка закрытия */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const SCAN_SIZE = 250

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#805AD5',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#805AD5',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanHint: {
    color: '#FFFFFF',
    fontSize: 15,
    marginTop: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
})
