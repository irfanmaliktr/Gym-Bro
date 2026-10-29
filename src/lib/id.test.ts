import { describe, expect, it } from 'vitest'
import { newId } from './id'

describe('newId', () => {
  it('returns non-empty, unique identifiers', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId()))
    expect(ids.size).toBe(200)
    for (const id of ids) expect(id.length).toBeGreaterThan(8)
  })

  it('matches the UUID shape when running in a secure context', () => {
    // Node exposes crypto.randomUUID, exactly like a browser on https/localhost.
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })
})
