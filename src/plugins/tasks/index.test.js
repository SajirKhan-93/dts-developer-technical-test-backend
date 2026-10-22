import { describe, test, expect, vi } from 'vitest'

import tasksPlugin, {
  checkTitle,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTaskStatus
} from './index.js'

describe('tasks plugin', () => {
  test('is named and versioned', () => {
    expect(tasksPlugin.name).toBe('tasks')
    expect(tasksPlugin.version).toBe('1.0.0')
  })

  test('registers every task route', () => {
    const server = { route: vi.fn(), logger: { info: vi.fn() } }

    tasksPlugin.register(server, {})

    const routes = server.route.mock.calls[0][0]
    expect(routes).toEqual([
      createTask,
      checkTitle,
      listTasks,
      getTask,
      updateTaskStatus,
      deleteTask
    ])
    expect(routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'POST /api/v1/tasks',
      'POST /api/v1/tasks/check-title',
      'GET /api/v1/tasks',
      'GET /api/v1/tasks/{id}',
      'PATCH /api/v1/tasks/{id}/status',
      'DELETE /api/v1/tasks/{id}'
    ])
    expect(server.logger.info).toHaveBeenCalledWith('Tasks plugin registered')
  })
})
