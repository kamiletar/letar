import { EventEmitter } from 'events'
import * as readline from 'readline'

export class ScannerService extends EventEmitter {
  private rl: readline.Interface

  constructor() {
    super()
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
  }

  start(): void {
    this.rl.on('line', (code: string) => {
      this.emit('scan', code.trim())
    })
  }

  stop(): void {
    this.rl.close()
  }
}
