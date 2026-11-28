// Two skin names are "the same" when they only differ in case, spaces or
// punctuation ("Beast Gang: Samoyed" and "beast gang samoyed").
export function normalizeSkinName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}
