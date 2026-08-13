import { Component, effect, Input, signal } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { type FileSecurityConfig, processFileWithSecurity } from '@letar/forms-core/security'
import { FieldBase } from '../core/field-base'

/**
 * Загрузка файлов — Angular-эквивалент `FieldFileUpload` (`@letar/forms-vue`,
 * `field-file-upload.ts`): нативный `<input type="file">` + drag&drop-зона вместо Ark UI
 * `FileUpload.Root` (Chakra-скин). Форма хранит `File[]` (при `maxFiles: 1` — массив из одного
 * файла, для единообразия API). Безопасность — тот же `processFileWithSecurity`
 * (`@letar/forms-core/security`), что и во всех остальных скинах: framework-agnostic, порт не
 * потребовался.
 */
@Component({
  selector: 'letar-field-file-upload',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div
          class="letar-field__dropzone"
          [attr.data-drag-over]="isDragOver()"
          [attr.data-field-name]="name"
          (click)="inputEl.click()"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave()"
          (drop)="onDrop($event, ctrl)"
        >
          <input
            #inputEl
            type="file"
            [attr.accept]="accept"
            [multiple]="maxFiles > 1"
            class="letar-field__dropzone-input"
            [attr.data-field-name]="name"
            (change)="onFileChange($event, ctrl)"
            (blur)="ctrl.markAsTouched()"
          />
          <span>Перетащите файл сюда или нажмите для выбора</span>
        </div>
        @if (rejectionReason()) {
          <p class="letar-field__error" role="alert" data-testid="file-rejection">{{ rejectionReason() }}</p>
        }
        @if (files().length > 0) {
          <ul class="letar-field__file-list">
            @for (file of files(); track file.name + $index; let i = $index) {
              <li class="letar-field__file-item">
                <span>{{ file.name }}</span>
                <button type="button" [attr.aria-label]="'Удалить ' + file.name" (click)="removeFile(ctrl, i)">
                  ✕
                </button>
              </li>
            }
          </ul>
        }
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldFileUploadComponent extends FieldBase {
  @Input()
  accept?: string
  @Input()
  maxFiles = 1
  @Input()
  security?: FileSecurityConfig

  readonly isDragOver = signal(false)
  readonly rejectionReason = signal('')
  readonly files = signal<File[]>([])

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => {
        const value = ctrl.value as File[] | undefined
        this.files.set(Array.isArray(value) ? value : [])
      }
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  private async processFiles(fileList: FileList | File[], ctrl: FormControl): Promise<void> {
    const incoming = Array.from(fileList).slice(0, this.maxFiles)
    const accepted: File[] = []
    for (const file of incoming) {
      if (this.security) {
        const result = await processFileWithSecurity(file, this.security)
        if (!result.valid) {
          this.rejectionReason.set(result.reason ?? 'Файл отклонён')
          continue
        }
        accepted.push(result.file)
      } else {
        accepted.push(file)
      }
    }
    if (accepted.length > 0) {
      this.rejectionReason.set('')
    }
    const current = this.files()
    const next = this.maxFiles === 1 ? accepted : [...current, ...accepted].slice(0, this.maxFiles)
    ctrl.setValue(next)
  }

  protected onFileChange(event: Event, ctrl: FormControl): void {
    const input = event.target as HTMLInputElement
    if (input.files) {
      void this.processFiles(input.files, ctrl)
    }
    input.value = ''
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault()
    this.isDragOver.set(true)
  }

  protected onDragLeave(): void {
    this.isDragOver.set(false)
  }

  protected onDrop(event: DragEvent, ctrl: FormControl): void {
    event.preventDefault()
    this.isDragOver.set(false)
    if (event.dataTransfer?.files) {
      void this.processFiles(event.dataTransfer.files, ctrl)
    }
  }

  protected removeFile(ctrl: FormControl, index: number): void {
    ctrl.setValue(this.files().filter((_, i) => i !== index))
  }
}
