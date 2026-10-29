import { afterEach } from 'vitest'
import { createDatabase, type GymbroDatabase } from '../db/database'

/**
 * Isolated database per test.
 *
 * Every call gets a unique name so files/workers can never share IndexedDB
 * state, and each one is closed + deleted after the test that created it.
 */
let sequence = 0
const pending: GymbroDatabase[] = []

export function useTestDatabase(): GymbroDatabase {
  sequence += 1
  const database = createDatabase(`gymbro_test_${Date.now().toString(36)}_${sequence}`)
  pending.push(database)
  return database
}

afterEach(async () => {
  while (pending.length > 0) {
    const database = pending.pop() as GymbroDatabase
    database.close()
    await database.delete()
  }
})
