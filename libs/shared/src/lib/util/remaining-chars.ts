export function remainingChars(value: string, maxLength: number): number {
  return Math.max(0, maxLength - value.length);
}
