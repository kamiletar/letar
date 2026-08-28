export type ScanResult =
  | { status: 'CLEAN' }
  | { status: 'INFECTED'; resultCode: string }
  | { status: 'SCAN_FAILED'; resultCode: string }

export interface FileScanner {
  readonly name: string
  readonly version: string
  scan(bytes: Buffer): Promise<ScanResult>
}
