'use client'

import { resolveStaticFormText } from '@letar/forms-core/i18n'
import { useFormI18n, useFormPendingRegistry } from '@letar/forms-react'
import { useRouter } from 'next/navigation'
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useDeclarativeForm } from './form-context'

type DirtyGuardTextKey = 'message' | 'dialogTitle' | 'dialogDescription' | 'confirmText' | 'cancelText'

/** Ключи `FormI18nProvider` для текстов защиты от ухода: `formDirtyGuard.<имя пропа>` */
const DIRTY_GUARD_KEY_PREFIX = 'formDirtyGuard.'

const DEFAULT_DIRTY_GUARD_TEXTS: Record<DirtyGuardTextKey, string> = {
  message: 'You have unsaved changes. Are you sure you want to leave?',
  dialogTitle: 'Unsaved changes',
  dialogDescription: 'You have unsaved changes. Are you sure you want to leave this page?',
  confirmText: 'Leave',
  cancelText: 'Stay',
}

/**
 * Встроенный словарь текстов `Form.DirtyGuard` по языку. Языка нет в словаре — английский.
 * Отдельный от `validation.*`: это статичный UI, а не сообщение об ошибке валидации.
 */
const BUILTIN_DIRTY_GUARD_TEXTS: Record<string, Record<DirtyGuardTextKey, string>> = {
  en: DEFAULT_DIRTY_GUARD_TEXTS,
  ru: {
    message: 'Есть несохранённые изменения. Вы уверены, что хотите уйти?',
    dialogTitle: 'Несохранённые изменения',
    dialogDescription: 'Есть несохранённые изменения. Вы уверены, что хотите покинуть страницу?',
    confirmText: 'Уйти',
    cancelText: 'Остаться',
  },
}

function resolveDirtyGuardBuiltin(key: DirtyGuardTextKey, locale: string): string {
  const lang = locale.split('-')[0] ?? locale
  return (BUILTIN_DIRTY_GUARD_TEXTS[lang] ?? DEFAULT_DIRTY_GUARD_TEXTS)[key]
}

/**
 * Props for DirtyGuard component
 */
export interface DirtyGuardProps {
  /**
   * Message to show in browser's native beforeunload dialog
   * Note: Most modern browsers ignore custom messages and show their own
   * @default встроенный текст по языку `FormI18nProvider` (ru/en), ключ `formDirtyGuard.message`
   */
  message?: string
  /**
   * Title for the confirmation dialog
   * @default встроенный текст по языку `FormI18nProvider` (ru/en), ключ `formDirtyGuard.dialogTitle`
   */
  dialogTitle?: string
  /**
   * Description for the confirmation dialog
   * @default встроенный текст по языку `FormI18nProvider` (ru/en), ключ `formDirtyGuard.dialogDescription`
   */
  dialogDescription?: string
  /**
   * Text for the confirm button
   * @default встроенный текст по языку `FormI18nProvider` (ru/en), ключ `formDirtyGuard.confirmText`
   */
  confirmText?: string
  /**
   * Text for the cancel button
   * @default встроенный текст по языку `FormI18nProvider` (ru/en), ключ `formDirtyGuard.cancelText`
   */
  cancelText?: string
  /**
   * Whether to enable the guard (default: true)
   * Can be used to conditionally disable the guard
   */
  enabled?: boolean
  /**
   * Callback when user attempts to leave with unsaved changes
   * Return false to allow navigation without confirmation
   */
  onBlock?: () => boolean | void
}

/**
 * Настройки автоматической защиты (`dirtyGuard` на форме или в `createForm`) —
 * те же тексты и `onBlock`, что у `Form.DirtyGuard`, без `enabled` (им управляет сам проп).
 */
export type DirtyGuardOptions = Omit<DirtyGuardProps, 'enabled'>

/** Значение пропа `dirtyGuard`: `true` — с текстами по умолчанию, объект — со своими, `false` — выключено */
export type DirtyGuardConfig = boolean | DirtyGuardOptions

/**
 * Итоговая конфигурация автоматической защиты: проп формы перебивает опцию `createForm`.
 * `false` на форме выключает защиту даже при включённой опции инстанса; объект на форме
 * дополняет объект инстанса (тексты формы важнее), `true` на форме оставляет тексты инстанса.
 * Возвращает `null` — защита выключена.
 */
export function resolveDirtyGuardConfig(
  instance: DirtyGuardConfig | undefined,
  form: DirtyGuardConfig | undefined,
): DirtyGuardOptions | null {
  const effective = form === undefined ? instance : form
  if (!effective) {
    return null
  }
  const instanceOptions = typeof instance === 'object' ? instance : {}
  const formOptions = typeof form === 'object' ? form : {}
  // `undefined` в объекте формы не затирает текст инстанса
  const definedFormOptions = Object.fromEntries(Object.entries(formOptions).filter(([, value]) => value !== undefined))
  return { ...instanceOptions, ...definedFormOptions }
}

/**
 * Реестр вручную поставленных `<Form.DirtyGuard />` внутри формы: пока хотя бы один смонтирован,
 * автоматическая защита уступает ему (иначе два диалога и два `beforeunload`).
 */
interface DirtyGuardRegistry {
  registerManual: () => () => void
}

const DirtyGuardRegistryContext = createContext<DirtyGuardRegistry | null>(null)

/**
 * Form.DirtyGuard - Prevent accidental navigation when form has unsaved changes
 *
 * Shows browser's native confirmation dialog when user tries to:
 * - Close the tab/window
 * - Refresh the page
 *
 * Shows custom dialog for in-app navigation:
 * - Clicking on Next.js Link components
 * - Clicking on anchor tags with internal hrefs
 *
 * @example Basic usage
 * ```tsx
 * <Form initialValue={data} onSubmit={handleSubmit}>
 *   <Form.DirtyGuard />
 *   <Form.Field.String name="title" />
 *   <Form.Button.Submit />
 * </Form>
 * ```
 *
 * @example With custom messages
 * ```tsx
 * <Form.DirtyGuard
 *   dialogTitle="Leaving?"
 *   dialogDescription="Data will be lost!"
 *   confirmText="Yes, leave"
 *   cancelText="No, stay"
 * />
 * ```
 */
function DirtyGuardCore({
  message: messageProp,
  dialogTitle: dialogTitleProp,
  dialogDescription: dialogDescriptionProp,
  confirmText: confirmTextProp,
  cancelText: cancelTextProp,
  enabled = true,
  onBlock,
}: DirtyGuardProps): ReactElement | null {
  const { form } = useDeclarativeForm()
  const i18n = useFormI18n()
  // Проп приложения — самое сильное; иначе перевод по ключу → словарь ru/en → английский
  const resolveText = (key: DirtyGuardTextKey, override: string | undefined): string =>
    override
      ?? resolveStaticFormText(i18n, DIRTY_GUARD_KEY_PREFIX + key, (locale) => resolveDirtyGuardBuiltin(key, locale))
  const message = resolveText('message', messageProp)
  const dialogTitle = resolveText('dialogTitle', dialogTitleProp)
  const dialogDescription = resolveText('dialogDescription', dialogDescriptionProp)
  const confirmText = resolveText('confirmText', confirmTextProp)
  const cancelText = resolveText('cancelText', cancelTextProp)
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const pendingHref = useRef<string | null>(null)

  // Оптимистичное действие поля, ждущее сервера, — тоже несохранённое изменение (§16.7): выбор ещё не в форме
  const pendingRegistry = useFormPendingRegistry()

  // Check isDirty
  const checkIsDirty = useCallback(() => {
    const state = form.state
    return state.isDirty || (pendingRegistry?.getSnapshot().count ?? 0) > 0
  }, [form, pendingRegistry])

  // Handler for beforeunload (tab close, refresh)
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent): string | undefined => {
      if (checkIsDirty()) {
        const shouldBlock = onBlock?.()
        if (shouldBlock === false) {
          return undefined
        }

        event.preventDefault()
        event.returnValue = message
        return message
      }
      return undefined
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled, message, onBlock, checkIsDirty])

  // Intercept clicks on internal links
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleClick = (event: MouseEvent) => {
      // Check if form is dirty
      if (!checkIsDirty()) {
        return
      }

      // Find closest anchor or element with data-href
      const target = event.target as HTMLElement
      const anchor = target.closest('a')

      if (!anchor) {
        return
      }

      const href = anchor.getAttribute('href')
      if (!href) {
        return
      }

      // Skip external links and special protocols
      if (
        href.startsWith('http://')
        || href.startsWith('https://')
        || href.startsWith('mailto:')
        || href.startsWith('tel:')
        || href.startsWith('#')
      ) {
        return
      }

      // Skip if target="_blank"
      if (anchor.target === '_blank') {
        return
      }

      // Skip if Ctrl/Cmd is held (open in new tab)
      if (event.ctrlKey || event.metaKey) {
        return
      }

      // Call onBlock callback
      const shouldBlock = onBlock?.()
      if (shouldBlock === false) {
        return
      }

      // Prevent navigation and show dialog
      event.preventDefault()
      event.stopPropagation()
      pendingHref.current = href
      setShowDialog(true)
    }

    // Use capture to intercept before Next.js
    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [enabled, onBlock, checkIsDirty])

  // Confirm navigation
  const handleConfirm = useCallback(() => {
    setShowDialog(false)
    if (pendingHref.current) {
      // Reset dirty state before navigation to avoid re-triggering
      form.reset()
      router.push(pendingHref.current)
      pendingHref.current = null
    }
  }, [form, router])

  // Cancel navigation
  const handleCancel = useCallback(() => {
    setShowDialog(false)
    pendingHref.current = null
  }, [])

  // Render confirmation dialog
  if (!showDialog) {
    return null
  }

  // Simple inline dialog (no dependency on Chakra Dialog)
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: 'var(--chakra-colors-bg-panel, white)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: '0 0 8px 0',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--chakra-colors-fg, inherit)',
          }}
        >
          {dialogTitle}
        </h2>
        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: '0.875rem',
            color: 'var(--chakra-colors-fg-muted, #666)',
          }}
        >
          {dialogDescription}
        </p>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--chakra-colors-border, #e2e8f0)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--chakra-colors-red-500, #e53e3e)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Form.DirtyGuard, поставленный вручную. Регистрируется в форме и отключает автоматическую
 * защиту (`dirtyGuard` на форме или в `createForm`), чтобы не дублировать диалог.
 * Явный `<Form.DirtyGuard />` работает и при `dirtyGuard={false}` — выключено только автоматическое.
 */
export function DirtyGuard(props: DirtyGuardProps): ReactElement | null {
  const registry = useContext(DirtyGuardRegistryContext)
  const registerManual = registry?.registerManual

  useEffect(() => registerManual?.(), [registerManual])

  return <DirtyGuardCore {...props} />
}

function AutoDirtyGuard(
  { options, manualCount }: { options: DirtyGuardOptions; manualCount: number },
): ReactElement | null {
  return <DirtyGuardCore {...options} enabled={manualCount === 0} />
}

/**
 * Область защиты формы: раздаёт реестр ручных guard и монтирует автоматический, если он включён.
 * Рендерится внутри `DeclarativeFormContext.Provider` (guard читает форму из контекста).
 */
export function DirtyGuardScope({
  config,
  children,
}: {
  config: DirtyGuardOptions | null
  children: ReactNode
}): ReactElement {
  const [manualCount, setManualCount] = useState(0)

  const registry = useMemo<DirtyGuardRegistry>(
    () => ({
      registerManual: () => {
        setManualCount((count) => count + 1)
        return () => setManualCount((count) => count - 1)
      },
    }),
    [],
  )

  return (
    <DirtyGuardRegistryContext.Provider value={registry}>
      {config && <AutoDirtyGuard options={config} manualCount={manualCount} />}
      {children}
    </DirtyGuardRegistryContext.Provider>
  )
}
