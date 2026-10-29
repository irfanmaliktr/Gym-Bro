/**
 * Primary key generation.
 *
 * PRD §8.2 defines every key as a UUID, so all rows created by the app use
 * `crypto.randomUUID()`. That API is available in every browser we target and
 * in Node 19+, but only in a *secure context* — opening the dev server from a
 * phone over `http://<lan-ip>:5173` is not one, so a deterministic fallback is
 * provided instead of throwing mid-workout.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
