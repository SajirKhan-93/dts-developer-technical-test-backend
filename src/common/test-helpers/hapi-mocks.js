import { vi } from 'vitest'

/** A stand-in for Hapi's response toolkit: every call returns the toolkit so calls can be chained */
export function buildH() {
  return {
    response: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    takeover: vi.fn().mockReturnThis()
  }
}

/** A stand-in for a Hapi request with a logger, a Prisma client and any extra properties */
export function buildRequest(overrides = {}) {
  return {
    params: {},
    query: {},
    payload: {},
    prisma: {},
    server: { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
    ...overrides
  }
}
