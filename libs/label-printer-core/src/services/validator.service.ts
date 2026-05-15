import type { MarkingCode } from '../models/marking-code.model'
import { GS1Parser } from '../parsers/gs1-parser'

export class ValidatorService {
  static validate(code: string): MarkingCode {
    return GS1Parser.parse(code)
  }
}
