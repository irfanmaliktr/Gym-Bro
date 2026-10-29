/**
 * Test setup: gives Node an IndexedDB implementation so the Dexie layer runs
 * unmodified (`fake-indexeddb` patches `globalThis`).
 */
import 'fake-indexeddb/auto'
