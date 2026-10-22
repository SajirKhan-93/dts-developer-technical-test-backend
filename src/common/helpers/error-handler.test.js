import { describe, test, expect, vi } from 'vitest'
import { handleError } from './error-handler.js'
import { NotFoundError } from '../errors/index.js'

describe('handleError', () => {
  const buildH = () => {
    const h = { response: vi.fn().mockReturnThis(), code: vi.fn() }
    return h
  }
  const request = { server: { logger: { error: vi.fn() } } }

  test('maps application errors to their status code', () => {
    const h = buildH()

    handleError(
      new NotFoundError('missing', 'TASK_NOT_FOUND', 'id'),
      request,
      h
    )

    expect(h.response).toHaveBeenCalledWith({
      errors: [{ errorCode: 'TASK_NOT_FOUND', message: 'missing', field: 'id' }]
    })
    expect(h.code).toHaveBeenCalledWith(404)
  })

  test('hides the details of unexpected errors', () => {
    const h = buildH()

    handleError(new Error('db password leaked'), request, h, 'FAILED', 'Failed')

    expect(h.response).toHaveBeenCalledWith({
      errors: [{ errorCode: 'FAILED', message: 'Failed', field: null }]
    })
    expect(h.code).toHaveBeenCalledWith(500)
  })
})
