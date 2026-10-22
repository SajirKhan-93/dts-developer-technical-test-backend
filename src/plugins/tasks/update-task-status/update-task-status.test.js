import { describe, test, expect, beforeEach, vi } from 'vitest'

import updateTaskStatus from './update-task-status.js'
import {
  buildH,
  buildRequest
} from '../../../common/test-helpers/hapi-mocks.js'
import { NotFoundError } from '../../../common/errors/index.js'

const { service } = vi.hoisted(() => ({
  service: { updateTaskStatus: vi.fn() }
}))

vi.mock('../services/task-service.js', () => ({
  TaskService: vi.fn(function () {
    return service
  })
}))

describe('update-task-status route', () => {
  let h

  beforeEach(() => {
    h = buildH()
  })

  describe('route configuration', () => {
    test('is a PATCH to /api/v1/tasks/{id}/status', () => {
      expect(updateTaskStatus.method).toBe('PATCH')
      expect(updateTaskStatus.path).toBe('/api/v1/tasks/{id}/status')
    })

    test('validates the id and the payload', () => {
      expect(updateTaskStatus.options.validate.params).toBeDefined()
      expect(updateTaskStatus.options.validate.payload).toBeDefined()
      expect(updateTaskStatus.options.validate.failAction).toBeTypeOf(
        'function'
      )
    })
  })

  describe('handler', () => {
    test('updates the status and returns the task', async () => {
      service.updateTaskStatus.mockResolvedValue({
        id: 3n,
        title: 'T',
        description: null,
        status: 'COMPLETED',
        due_date_time: new Date('2026-11-30T17:00:00.000Z'),
        created_at: new Date('2026-10-22T09:15:30.000Z')
      })

      await updateTaskStatus.handler(
        buildRequest({ params: { id: 3 }, payload: { status: 'COMPLETED' } }),
        h
      )

      expect(service.updateTaskStatus).toHaveBeenCalledWith(3, 'COMPLETED')
      expect(h.response.mock.calls[0][0]).toMatchObject({
        id: 3,
        status: 'COMPLETED'
      })
      expect(h.code).toHaveBeenCalledWith(200)
    })

    test('returns 404 when the task does not exist', async () => {
      service.updateTaskStatus.mockRejectedValue(
        new NotFoundError('missing', 'TASK_NOT_FOUND', 'id')
      )

      await updateTaskStatus.handler(
        buildRequest({ params: { id: 9 }, payload: { status: 'TODO' } }),
        h
      )

      expect(h.code).toHaveBeenCalledWith(404)
    })

    test('returns a generic 500 for an unexpected error', async () => {
      service.updateTaskStatus.mockRejectedValue(new Error('db down'))

      await updateTaskStatus.handler(
        buildRequest({ params: { id: 1 }, payload: { status: 'TODO' } }),
        h
      )

      expect(h.response.mock.calls[0][0].errors[0].errorCode).toBe(
        'TASK_STATUS_UPDATE_FAILED'
      )
      expect(h.code).toHaveBeenCalledWith(500)
    })
  })
})
