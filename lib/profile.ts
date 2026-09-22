const invisible = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const arabicMarks = /[\u0610-\u061A\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const allowedName = /^[\p{L}\p{M}\p{N} _.'’\-]+$/u;

export function cleanDisplayName(value: string): string {
  return value.normalize('NFKC').replace(invisible, '').replace(/\s+/g, ' ').trim();
}

export function displayNameKey(value: string): string {
  return cleanDisplayName(value)
    .replace(arabicMarks, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateDisplayName(value: string): { displayName: string; nameKey: string } | null {
  const displayName = cleanDisplayName(value);
  const length = Array.from(displayName).length;
  if (length < 2 || length > 30 || !allowedName.test(displayName) || !/[\p{L}\p{N}]/u.test(displayName)) return null;
  const nameKey = displayNameKey(displayName);
  if (Array.from(nameKey).length < 2) return null;
  return { displayName, nameKey };
}
