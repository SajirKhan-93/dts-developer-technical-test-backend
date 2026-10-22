import { describe, test, expect, beforeEach, vi } from 'vitest'

import deleteTask from './delete-task.js'
import {
  buildH,
  buildRequest
} from '../../../common/test-helpers/hapi-mocks.js'
import { NotFoundError } from '../../../common/errors/index.js'

const { service } = vi.hoisted(() => ({ service: { deleteTask: vi.fn() } }))

vi.mock('../services/task-service.js', () => ({
  TaskService: vi.fn(function () {
    return service
  })
}))

describe('delete-task route', () => {
  let h

  beforeEach(() => {
    h = buildH()
  })

  describe('route configuration', () => {
    test('is a DELETE to /api/v1/tasks/{id}', () => {
      expect(deleteTask.method).toBe('DELETE')
      expect(deleteTask.path).toBe('/api/v1/tasks/{id}')
    })

    test('validates the id', () => {
      expect(deleteTask.options.validate.params).toBeDefined()
      expect(deleteTask.options.validate.failAction).toBeTypeOf('function')
    })
  })

  describe('handler', () => {
    test('deletes the task and returns 204 with no body', async () => {
      service.deleteTask.mockResolvedValue(undefined)

      await deleteTask.handler(buildRequest({ params: { id: 3 } }), h)

      expect(service.deleteTask).toHaveBeenCalledWith(3)
      expect(h.response).toHaveBeenCalledWith()
      expect(h.code).toHaveBeenCalledWith(204)
    })

    test('returns 404 when the task does not exist', async () => {
      service.deleteTask.mockRejectedValue(
        new NotFoundError('missing', 'TASK_NOT_FOUND', 'id')
      )

      await deleteTask.handler(buildRequest({ params: { id: 9 } }), h)

      expect(h.code).toHaveBeenCalledWith(404)
    })

    test('returns a generic 500 for an unexpected error', async () => {
      service.deleteTask.mockRejectedValue(new Error('db down'))

      await deleteTask.handler(buildRequest({ params: { id: 1 } }), h)

      expect(h.response.mock.calls[0][0].errors[0].errorCode).toBe(
        'TASK_DELETE_FAILED'
      )
      expect(h.code).toHaveBeenCalledWith(500)
    })
  })
})
