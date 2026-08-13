export function minutesToHHMM(minutes: number): { hours: number; mins: number } {
  return { hours: Math.floor(minutes / 60), mins: minutes % 60 }
}

export function hhmmToMinutes(hours: number, mins: number): number {
  return hours * 60 + mins
}
