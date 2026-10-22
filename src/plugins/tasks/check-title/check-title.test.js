import { describe, test, expect, beforeEach, vi } from 'vitest'

import checkTitle from './check-title.js'
import {
  buildH,
  buildRequest
} from '../../../common/test-helpers/hapi-mocks.js'

const { service } = vi.hoisted(() => ({
  service: { checkDuplicateTitle: vi.fn() }
}))

vi.mock('../services/task-service.js', () => ({
  TaskService: vi.fn(function () {
    return service
  })
}))

describe('check-title route', () => {
  let h

  beforeEach(() => {
    h = buildH()
  })

  describe('route configuration', () => {
    test('is a POST to /api/v1/tasks/check-title', () => {
      expect(checkTitle.method).toBe('POST')
      expect(checkTitle.path).toBe('/api/v1/tasks/check-title')
    })

    test('validates the payload', () => {
      expect(checkTitle.options.validate.payload).toBeDefined()
      expect(checkTitle.options.validate.failAction).toBeTypeOf('function')
    })
  })

  describe('handler', () => {
    test('returns 200 when the title is available', async () => {
      service.checkDuplicateTitle.mockResolvedValue({ isValid: true })
      const request = buildRequest({ payload: { title: 'Brand new' } })

      await checkTitle.handler(request, h)

      expect(service.checkDuplicateTitle).toHaveBeenCalledWith(request.payload)
      expect(h.response).toHaveBeenCalledWith({
        title: 'Brand new',
        valid: true
      })
      expect(h.code).toHaveBeenCalledWith(200)
    })

    test('returns 400 with a validation error when the title is taken', async () => {
      const errors = {
        errorCode: 'TASK_TITLE_DUPLICATE',
        message: 'A task with this title already exists',
        field: 'title'
      }
      service.checkDuplicateTitle.mockResolvedValue({ isValid: false, errors })

      await checkTitle.handler(buildRequest({ payload: { title: 'Taken' } }), h)

      expect(h.response).toHaveBeenCalledWith({ validationErrors: [errors] })
      expect(h.code).toHaveBeenCalledWith(400)
    })

    test('returns a generic 500 for an unexpected error', async () => {
      service.checkDuplicateTitle.mockRejectedValue(new Error('db down'))

      await checkTitle.handler(buildRequest({ payload: { title: 'T' } }), h)

      expect(h.response.mock.calls[0][0].errors[0].errorCode).toBe(
        'TASK_TITLE_CHECK_FAILED'
      )
      expect(h.code).toHaveBeenCalledWith(500)
    })
  })
})
