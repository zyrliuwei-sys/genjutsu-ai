// Storage can be denied in embedded/private browsers. Keep the current page
// usable even then; callers requiring persistence can inspect the return value.
const memory = new Map<string, string>();

export function readSessionValue(key: string): string | null {
  try {
    const value = sessionStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    /* Use the current page's copy. */
  }
  return memory.get(key) ?? null;
}

export function writeSessionValue(key: string, value: string): boolean {
  memory.set(key, value);
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeSessionValue(key: string) {
  memory.delete(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Storage may be denied. */
  }
}
